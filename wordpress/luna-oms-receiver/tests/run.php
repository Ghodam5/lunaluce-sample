<?php
/**
 * WordPress なしで受け取りの流れを確かめる。WordPress と Welcart の関数を、配列にためるだけの代わりの関数で置き換える。
 * 使い方: php wordpress/luna-oms-receiver/tests/run.php
 */
define( 'ABSPATH', sys_get_temp_dir() . '/luna-wp/' );
define( 'USCES_ITEM_CAT_PARENT_ID', 2 );
$GLOBALS['db'] = array( 'posts' => array(), 'items' => array(), 'skus' => array(), 'meta' => array(), 'options' => array( 'usces_zaiko_status' => array( '在庫有り', '在庫僅少', '売切れ', '入荷待ち', '廃盤' ), 'usces' => array( 'tax_mode' => 'include', 'business_days' => array( 2026 => array( 12 => array( 31 => 0 ) ) ) ) ), 'next' => 10 );
function get_option( $k, $d = false ) { return $GLOBALS['db']['options'][ $k ] ?? $d; }
function update_option( $k, $v, $a = null ) { $GLOBALS['db']['options'][ $k ] = $v; return true; }
function wel_get_id_by_item_code( $code, $cache = true ) { foreach ( $GLOBALS['db']['items'] as $id => $i ) { if ( $i['itemCode'] === $code ) { return $id; } } return false; }
function wel_get_item( $id, $c = true ) { return $GLOBALS['db']['items'][ $id ] ?? array(); }
function wel_update_item_data( $d, $id, $del = false ) { $GLOBALS['db']['items'][ $id ] = $d; }
function wel_get_skus( $id, $s = 'sort', $c = true ) { $o = array(); foreach ( $GLOBALS['db']['skus'] as $mid => $k ) { if ( $k['post_id'] === $id ) { $x = $k; unset( $x['post_id'] ); $x['meta_id'] = $mid; $o[] = $x; } } return $o; }
function wel_add_sku_data( $id, $s ) { $mid = $GLOBALS['db']['next']++; $GLOBALS['db']['skus'][ $mid ] = array_merge( $s, array( 'post_id' => $id ) ); return $mid; }
function wel_update_sku_data_by_id( $mid, $id, $s ) { $GLOBALS['db']['skus'][ $mid ] = array_merge( $s, array( 'post_id' => $id ) ); }
function wp_insert_post( $p, $e = false ) { $id = $GLOBALS['db']['next']++; $GLOBALS['db']['posts'][ $id ] = (object) $p; return $id; }
function wp_update_post( $p ) { $id = $p['ID']; foreach ( $p as $k => $v ) { if ( 'ID' !== $k && isset( $GLOBALS['db']['posts'][ $id ] ) ) { $GLOBALS['db']['posts'][ $id ]->$k = $v; } } }
function get_post( $id ) { return $GLOBALS['db']['posts'][ $id ]; }
function is_wp_error( $x ) { return $x instanceof WP_Error; }
class WP_Error { public $m; function __construct( $c, $m ) { $this->m = $m; } function get_error_message() { return $this->m; } }
function get_post_meta( $id, $k, $s = false ) { return $GLOBALS['db']['meta'][ $id ][ $k ] ?? ''; }
function update_post_meta( $id, $k, $v ) { $GLOBALS['db']['meta'][ $id ][ $k ] = $v; }
function clean_post_cache( $id ) {}
function get_posts( $a ) { return array(); }
function wp_delete_attachment( $id, $f ) {}
function wp_tempnam( $n ) { return tempnam( sys_get_temp_dir(), 'luna' ); }
function media_handle_sideload( $file, $post_id, $title ) { $id = $GLOBALS['db']['next']++; $GLOBALS['db']['posts'][ $id ] = (object) array( 'post_title' => $title, 'post_type' => 'attachment', 'file' => $file['name'] ); return $id; }
function set_post_thumbnail( $p, $a ) { $GLOBALS['db']['meta'][ $p ]['_thumbnail_id'] = $a; }
function download_url( $url, $t ) { $GLOBALS['downloads'][] = $url; return tempnam( sys_get_temp_dir(), 'luna' ); }
function trailingslashit( $s ) { return rtrim( $s, '/' ) . '/'; }
function current_time( $t ) { return '2026-11-22 00:00:00'; }
function wp_get_current_user() { return (object) array( 'user_login' => 'tester' ); }
@mkdir( ABSPATH . 'wp-admin/includes', 0777, true );
foreach ( array( 'file', 'media', 'image' ) as $f ) { file_put_contents( ABSPATH . "wp-admin/includes/$f.php", '<?php' ); }
require __DIR__ . '/../includes/class-mapper.php';
require __DIR__ . '/../includes/class-writer.php';

$fail = 0;
function check( $label, $ok ) { global $fail; echo ( $ok ? 'ok   ' : 'FAIL ' ) . $label . "\n"; if ( ! $ok ) { $fail++; } }

$draft = array(
	'kind'     => 'luna-site-builder-draft',
	'products' => array(
		array( 'active' => true, 'photos' => array( 'images/a.jpg', 'images/uploads/b-20261122.jpg' ), 'product' => array( 'id' => '90001', 'code' => 'll-doll-001', 'title' => 'テスト人形', 'description' => "説明\n2行目", 'size' => '高さ10cm', 'notice' => '<注意>', 'minq' => 2, 'skus' => array( array( 'code' => 'll-doll-001-1', 't' => 'S', 'price' => 1000 ), array( 'code' => 'll-doll-001-2', 't' => 'M', 'price' => 1500 ) ) ), 'stock' => array( 'status' => 'wait', 'eta' => '2026-12-10' ) ),
	),
	'stock'    => array( array( 'id' => '1', 'code' => 'nothing-here', 'status' => 'out' ) ),
	'uploads'  => array( array( 'path' => 'images/uploads/b-20261122.jpg', 'dataUrl' => 'data:image/jpeg;base64,' . base64_encode( 'JPEGDATA' ) ) ),
	'businessDays' => array( 'from' => '2026-12-28', 'to' => '2027-01-04', 'holidays' => array( '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01' ) ),
);
$opts = array( 'image_base' => 'https://example.test/site/' );

// 1. 試し: 何も書かない
$r = Luna_OMS_Writer::run( $draft, true, $opts );
check( '試しは成功', $r['ok'] && 'create' === $r['items'][0]['action'] );
check( '試しでは何も書かない', ! $GLOBALS['db']['posts'] && ! $GLOBALS['db']['skus'] && ! isset( $GLOBALS['db']['options']['luna_oms_receiver_log'] ) );
check( '営業日の変更の数（12/28〜1/4 のうち休み4日、12/31はもとから休み）', 3 === count( $r['days']['changes'] ) );
check( 'コードの無い在庫は飛ばす', 'skip' === $r['stock'][0]['action'] );

// 2. 登録
$r  = Luna_OMS_Writer::run( $draft, false, $opts );
$id = wel_get_id_by_item_code( 'll-doll-001' );
check( '商品を作った', $id && 'item' === get_post( $id )->post_mime_type && 'publish' === get_post( $id )->post_status && array( 2 ) === get_post( $id )->post_category );
check( '本文に説明・仕様・注意（エスケープ）', false !== strpos( get_post( $id )->post_content, '説明<br>' ) && false !== strpos( get_post( $id )->post_content, '<th>サイズ</th>' ) && false !== strpos( get_post( $id )->post_content, '&lt;注意&gt;' ) );
$skus = wel_get_skus( $id );
check( '種類2つ・入荷待ち(3)・価格', 2 === count( $skus ) && 3 === $skus[0]['stock'] && 1500.0 === $skus[1]['price'] && '個' === $skus[0]['unit'] );
check( 'Welcartの項目に既定値', 'll-doll-001' === wel_get_item( $id )['itemCode'] && 0 === wel_get_item( $id )['itemPointrate'] );
check( '写真2枚（コード・コード__1）、1枚目はサイトから・2枚目は下書きから', array( 'images/a.jpg', 'images/uploads/b-20261122.jpg' ) === get_post_meta( $id, '_luna_oms_photos' ) && array( 'https://example.test/site/images/a.jpg' ) === $GLOBALS['downloads'] );
$titles = array();
foreach ( $GLOBALS['db']['posts'] as $p ) { if ( ( $p->post_type ?? '' ) === 'attachment' ) { $titles[] = $p->post_title; } }
check( '写真の題名', array( 'll-doll-001', 'll-doll-001__1' ) === $titles );
check( 'Welcartの itemPicts に写真の番号（1つ目がメイン）', 2 === count( wel_get_item( $id )['itemPicts'] ) && wel_get_item( $id )['itemPicts'][0] === get_post_meta( $id, '_thumbnail_id' ) );
check( '入荷予定日・最低数量を記録', '2026-12-10' === get_post_meta( $id, '_luna_oms_eta' ) && 2 === get_post_meta( $id, '_luna_oms_minq' ) );
$bd = get_option( 'usces' )['business_days'];
check( '営業日: 12/29休み・1/2営業・12/31休み', 0 === $bd[2026][12][29] && 1 === $bd[2027][1][2] && 0 === $bd[2026][12][31] );
check( '記録を残す', 1 === count( get_option( 'luna_oms_receiver_log' ) ) );

// 3. 同じものをもう一度 → 変更なし
$r = Luna_OMS_Writer::run( $draft, true, $opts );
check( '同じ内容なら「変更なし」', 'same' === $r['items'][0]['action'] );

// 4. 編集: 価格と名前を変え、種類を1つ減らし、在庫を欠品に
$edit = $draft;
$edit['products'] = array();
$edit['edits'] = array( $draft['products'][0] );
$edit['edits'][0]['product']['title'] = 'テスト人形（改）';
$edit['edits'][0]['product']['skus'] = array( array( 'code' => 'll-doll-001-1', 't' => 'S', 'price' => 1200 ) );
$edit['edits'][0]['stock'] = array( 'status' => 'out' );
unset( $edit['businessDays'] );
$r = Luna_OMS_Writer::run( $edit, true, $opts );
$c = implode( '|', $r['items'][0]['changes'] );
check( '編集の差分: 商品名・価格・在庫・残す種類の注意', 'update' === $r['items'][0]['action'] && false !== strpos( $c, '商品名を変更' ) && false !== strpos( $c, '価格 1,000→1,200円' ) && false !== strpos( $c, 'Welcartにだけある種類 ll-doll-001-2' ) );
Luna_OMS_Writer::run( $edit, false, $opts );
$skus = wel_get_skus( $id );
check( '編集を反映（種類は消さない）', 'テスト人形（改）' === get_post( $id )->post_title && 1200.0 === $skus[0]['price'] && 2 === $skus[0]['stock'] && 2 === count( $skus ) );

// 5. 在庫だけ
$r = Luna_OMS_Writer::run( array( 'stock' => array( array( 'id' => '90001', 'code' => 'll-doll-001', 'status' => 'few' ) ) ), false, $opts );
check( '在庫だけ切り替え', 1 === wel_get_skus( $id )[0]['stock'] && 'update' === $r['stock'][0]['action'] );

// 6. おかしな行は登録しない
$r = Luna_OMS_Writer::run( array( 'products' => array( array( 'product' => array( 'code' => 'bad code', 'title' => '', 'skus' => array() ) ) ) ), true, $opts );
check( 'おかしな行は「登録できない」', ! $r['ok'] && 'error' === $r['items'][0]['action'] && 3 === count( $r['items'][0]['changes'] ) );
check( 'Welcartの在庫状態の名前で番号を探す', 3 === Luna_OMS_Mapper::stock_index( 'wait', array( 9 => 'x', 3 => '入荷待ち' ) ) && 2 === Luna_OMS_Mapper::stock_index( 'out', array() ) );

// 7. 注文の試験送信（初期オフ）
$GLOBALS['hooks'] = array();
$GLOBALS['http']  = array();
if ( ! function_exists( 'add_action' ) ) {
	function add_action( $h, $c, $p = 10, $n = 1 ) { $GLOBALS['hooks'][ $h ][] = $c; }
}
if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( $v ) { return json_encode( $v, JSON_UNESCAPED_UNICODE ); }
}
if ( ! function_exists( 'wp_remote_post' ) ) {
	function wp_remote_post( $url, $a = array() ) { $GLOBALS['http'][] = array( 'url' => $url, 'args' => $a ); return array( 'response' => array( 'code' => 200 ), 'body' => '{"ok":true}' ); }
}
if ( ! function_exists( 'wp_remote_retrieve_response_code' ) ) {
	function wp_remote_retrieve_response_code( $r ) { return is_array( $r ) ? ( $r['response']['code'] ?? 0 ) : 0; }
}
if ( ! function_exists( 'esc_html' ) ) { function esc_html( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES, 'UTF-8' ); } }
if ( ! function_exists( 'esc_url' ) ) { function esc_url( $s ) { return $s; } }
if ( ! function_exists( 'admin_url' ) ) { function admin_url( $s ) { return 'https://renewal-test.luna-luce.info/wp-admin/' . $s; } }
require __DIR__ . '/../includes/class-order-send.php';
check( '試験送信は初期オフ', false === Luna_OMS_Order_Send::enabled() );
check( '送り先は試験受け口に固定', true === Luna_OMS_Order_Send::destination_ok() && false !== strpos( Luna_OMS_Order_Send::PINNED_URL, 'oms.srv2050136.hstgr.cloud/intake-api/test-orders' ) );
$GLOBALS['hooks'] = array();
Luna_OMS_Order_Send::init();
check( 'オフのときは Welcart の受注フックを登録しない', empty( $GLOBALS['hooks'][ Luna_OMS_Order_Send::HOOK ] ) );
$payload = Luna_OMS_Order_Send::payload( array(
	'order_id'  => 42,
	'cart'      => array( array( 'sku' => 'LL-1', 'name' => '試験商品', 'quant' => 2, 'price' => 500, 'customer_email' => 'secret@example.com' ) ),
	'entry'     => array( 'order' => array( 'total_full_price' => 1000, 'payment_name' => '銀行振込' ), 'customer' => array( 'tel' => '09000000000', 'mailaddress' => 'secret@example.com', 'address1' => '秘密の住所' ) ),
	'payments'  => array( 'name' => '銀行振込' ),
) );
$enc = wp_json_encode( $payload );
check( '送信本体に住所・電話・メールを含めない', false === strpos( $enc, 'secret@example.com' ) && false === strpos( $enc, '09000000000' ) && false === strpos( $enc, '秘密の住所' ) );
check( '送信本体は検証用サイトと注文明細だけ', 'https://renewal-test.luna-luce.info' === $payload['source'] && '42' === $payload['order_id'] && 'LL-1' === $payload['items'][0]['code'] && 2 === $payload['items'][0]['qty'] );
update_option( Luna_OMS_Order_Send::OPTION, 'on' );
update_option( Luna_OMS_Order_Send::TOKEN_OPTION, 'intake-secret-123' );
check( 'トークンとオンがあって初めて有効', true === Luna_OMS_Order_Send::enabled() );
$GLOBALS['hooks'] = array();
$GLOBALS['http']  = array();
Luna_OMS_Order_Send::init();
check( 'オンのときだけ usces_action_reg_orderdata を登録', ! empty( $GLOBALS['hooks'][ 'usces_action_reg_orderdata' ] ) );
Luna_OMS_Order_Send::on_reg_order( array( 'order_id' => 42, 'cart' => array(), 'entry' => array() ) );
check( 'オンなら試験受け口へだけ POST する', 1 === count( $GLOBALS['http'] ) && Luna_OMS_Order_Send::PINNED_URL === $GLOBALS['http'][0]['url'] );
$hdr = $GLOBALS['http'][0]['args']['headers']['Authorization'];
check( 'Authorization はあるが、ログにはトークンを残さない', 0 === strpos( $hdr, 'Bearer ' ) && false === strpos( wp_json_encode( get_option( Luna_OMS_Order_Send::LOG_OPTION, array() ) ), 'intake-secret-123' ) );
update_option( Luna_OMS_Order_Send::OPTION, 'off' );
$GLOBALS['http'] = array();
Luna_OMS_Order_Send::on_reg_order( array( 'order_id' => 43, 'cart' => array(), 'entry' => array() ) );
check( 'オフに戻すと送信しない', 0 === count( $GLOBALS['http'] ) );
check( '確認文は決め打ち', '試験送信をオンにする' === Luna_OMS_Order_Send::CONFIRM );

echo $fail ? "\n$fail 件失敗\n" : "\nすべて通りました\n";
exit( $fail ? 1 : 0 );
