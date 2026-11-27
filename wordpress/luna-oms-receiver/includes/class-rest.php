<?php
/**
 * 自動で送るときの入口。WordPress のアプリケーションパスワード（ユーザー → プロフィール）で認証する。
 *   GET  /wp-json/luna-oms/v1/status   Welcart の版・在庫状態の名前・税の設定
 *   POST /wp-json/luna-oms/v1/import   { draft: {…site-builder-draft.json…}, dry_run: true|false }
 * dry_run を省くと試し（何も書かない）。登録するときは dry_run: false をはっきり送る。
 */
class Luna_OMS_Rest {
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
	}

	public static function can() {
		return current_user_can( 'manage_options' );
	}

	public static function routes() {
		register_rest_route(
			'luna-oms/v1',
			'/status',
			array(
				'methods'             => 'GET',
				'permission_callback' => array( __CLASS__, 'can' ),
				'callback'            => function () {
					$opt = get_option( 'usces' );
					return array(
						'receiver' => LUNA_OMS_RECEIVER_VERSION,
						'welcart'  => defined( 'USCES_VERSION' ) ? USCES_VERSION : '',
						'ready'    => '' === Luna_OMS_Writer::ready(),
						'zaiko'    => Luna_OMS_Writer::zaiko_labels(),
						'taxMode'  => is_array( $opt ) && isset( $opt['tax_mode'] ) ? $opt['tax_mode'] : '',
					);
				},
			)
		);
		register_rest_route(
			'luna-oms/v1',
			'/import',
			array(
				'methods'             => 'POST',
				'permission_callback' => array( __CLASS__, 'can' ),
				'callback'            => function ( WP_REST_Request $req ) {
					$draft = $req->get_param( 'draft' );
					if ( ! is_array( $draft ) ) {
						return new WP_Error( 'luna_bad', 'draft がありません', array( 'status' => 400 ) );
					}
					$dry = false !== $req->get_param( 'dry_run' );
					return Luna_OMS_Writer::run( $draft, $dry, array( 'image_base' => Luna_OMS_Admin::image_base() ) );
				},
			)
		);
	}
}
