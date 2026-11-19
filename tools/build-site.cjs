const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),src=path.join(root,'site-src');
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const digest=p=>crypto.createHash('sha256').update(read(p)).digest('hex');
const args=new Set(process.argv.slice(2));
require('./products.cjs').build(args.has('--check'));
require('./site-content.cjs').build(args.has('--check'));
const version=JSON.parse(read(path.join(src,'version.json'))).version;
if(!Number.isSafeInteger(version)||version<1)throw Error('Invalid version');
const pages=JSON.parse(read(path.join(src,'pages.json')));
const sharedFiles=fs.readdirSync(path.join(src,'shared')).filter(f=>f.endsWith('.html')).map(f=>'site-src/shared/'+f).concat(['style.css','header-scroll.js','hscroll.js','catico.js','notes-resize.css','notes-resize.js','navigation-position.js','page-share.css','page-share.js','site-services.css','site-services-core.js','site-services-ui.js']).concat(fs.readdirSync(path.join(root,'images/social')).filter(f=>f.endsWith('.svg')).map(f=>'images/social/'+f));
const hashes=Object.fromEntries(sharedFiles.sort().map(f=>[f,digest(path.join(root,f))]));
const lock=path.join(src,'shared.lock.json');
if(args.has('--update-shared-lock'))fs.writeFileSync(lock,JSON.stringify(hashes,null,2)+'\n');
if(!fs.existsSync(lock))throw Error('Common parts lock missing');
const expected=JSON.parse(read(lock));
const changed=Object.keys({...hashes,...expected}).filter(k=>hashes[k]!==expected[k]);
if(changed.length)throw Error('共通部分が変更されています。林さんの指示対象か確認してください。承認済みの共通変更だけ --update-shared-lock で記録します:\n'+changed.join('\n'));
function render(text,vars,stack=[]){
 text=text.replace(/{{>\s*([\w-]+)\s*}}/g,(_,name)=>{if(stack.includes(name))throw Error('Recursive include '+name);const p=path.join(src,'shared',name+'.html');return render(read(p),vars,[...stack,name]);});
 text=text.replace(/{{#(\w+)}}([\s\S]*?){{\/\1}}/g,(_,k,body)=>vars[k]?body:'');
 text=text.replace(/{{(\w+)}}/g,(_,k)=>{if(!(k in vars))throw Error('Unknown variable '+k);return String(vars[k]);});
 if(/{{[>#/]/.test(text))throw Error('Unresolved template');return text;
}
let stale=[];for(const [file,settings] of Object.entries(pages)){
 if(path.basename(file)!==file||!file.endsWith('.html'))throw Error('Invalid page path');
 const source=read(path.join(src,'pages',file));
 if(!source.includes('{{> services-head}}')||!source.includes('{{> services-script}}'))throw Error('サイト共通サービスが不足しています: '+file);
 if(!source.includes('{{> share-head}}')||!source.includes('{{> share-script}}'))throw Error('SNS共通パーツが不足しています: '+file);
 const out=render(source,{...settings,version});
 const dest=path.join(root,file);
 if(args.has('--check')){if(!fs.existsSync(dest)||read(dest)!==out)stale.push(file);}
 else if(!fs.existsSync(dest)||read(dest)!==out)fs.writeFileSync(dest,out);
}
const orphan=fs.readdirSync(root).filter(f=>f.endsWith('.html')&&!(f in pages));if(orphan.length)throw Error('Page config missing: '+orphan.join(','));
if(stale.length)throw Error('生成HTMLと編集元が不一致です。node tools/build-site.cjs を実行してください:\n'+stale.join('\n'));
console.log((args.has('--check')?'確認':'生成')+'完了：'+Object.keys(pages).length+'ページ／v'+version+'（共通部分の保護も一致）');
