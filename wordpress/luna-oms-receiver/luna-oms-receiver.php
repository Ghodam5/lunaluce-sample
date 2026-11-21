<?php
/**
 * Plugin Name: Luna OMS Receiver（OMSからの受け取り）
 * Description: ルナルーチェOMSで作った商品・在庫の状態・営業日を、Welcartに登録します。まずテスト環境で使い、本番に入れるのは担当者の確認後。
 * Version: 0.1.1
 * Requires PHP: 7.4
 * Author: Luna Luce
 * Text Domain: luna-oms-receiver
 *
 * 部品の分け方:
 *   includes/class-mapper.php  OMSの1商品 → Welcartの商品・SKUの形（WordPressに触らない。tests/ で確かめる）
 *   includes/class-writer.php  Welcartへの書き込み（商品・SKU・写真・在庫・営業日）。試し（dry run）なら何も書かず差分だけ返す
 *   includes/class-admin.php   管理画面「OMSから取り込む」: 下書きファイルを選ぶ → 差分を確認 → 登録
 *   includes/class-rest.php    自動で送るときの入口（/wp-json/luna-oms/v1/…、アプリケーションパスワードで認証）
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
define( 'LUNA_OMS_RECEIVER_VERSION', '0.1.1' );
define( 'LUNA_OMS_RECEIVER_DIR', __DIR__ );

require_once __DIR__ . '/includes/class-mapper.php';
require_once __DIR__ . '/includes/class-writer.php';
require_once __DIR__ . '/includes/class-admin.php';
require_once __DIR__ . '/includes/class-rest.php';

add_action( 'plugins_loaded', function () {
	Luna_OMS_Admin::init();
	Luna_OMS_Rest::init();
} );
