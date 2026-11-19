const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
test('商品ページの変更は共通部品へ波及せず、共通部品の無断変更と生成漏れを検出する',()=>{
 const project=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'lunaluce-build-test-'));
 const run=(args=[],ok=true)=>{const p=cp.spawnSync(process.execPath,[path.join(tmp,'tools/build-site.cjs'),...args],{encoding:'utf8'});assert.equal(p.status===0,ok,p.stdout+p.stderr);};
 try{
  for(const f of ['site-src','tools/build-site.cjs','style.css','header-scroll.js','hscroll.js','catico.js','notes-resize.css','notes-resize.js']){fs.mkdirSync(path.dirname(path.join(tmp,f)),{recursive:true});fs.cpSync(path.join(project,f),path.join(tmp,f),{recursive:true});}
  run();run(['--check']);const before=fs.readFileSync(path.join(tmp,'top.html'),'utf8'),item=fs.readFileSync(path.join(tmp,'item.html'),'utf8');
  const source=path.join(tmp,'site-src/pages/item.html');fs.appendFileSync(source,'\n<!-- 商品ページだけの試験 -->');run(['--check'],false);run();assert.equal(fs.readFileSync(path.join(tmp,'top.html'),'utf8'),before);assert.equal(fs.readFileSync(path.join(tmp,'item.html'),'utf8'),item+'\n<!-- 商品ページだけの試験 -->');
  const footer=path.join(tmp,'site-src/shared/footer.html');fs.appendFileSync(footer,'<!-- 共通部品変更の試験 -->');run([],false);run(['--update-shared-lock']);assert.ok(fs.readFileSync(path.join(tmp,'top.html'),'utf8').includes('共通部品変更の試験'));assert.ok(fs.readFileSync(path.join(tmp,'item.html'),'utf8').includes('共通部品変更の試験'));
  fs.appendFileSync(path.join(tmp,'item.html'),'<!-- 生成HTMLへの直接変更 -->');run(['--check'],false);
 }finally{const resolved=path.resolve(tmp),parent=path.resolve(os.tmpdir())+path.sep;assert.ok(resolved.startsWith(parent)&&path.basename(resolved).startsWith('lunaluce-build-test-'));fs.rmSync(resolved,{recursive:true,force:true});}
});
