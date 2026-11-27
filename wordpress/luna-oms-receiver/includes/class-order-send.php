<?php
/**
 * 検証用サイトから OMS の試験受け口へ、注文を送る部品。
 * 初期状態はオフ。オンにするには管理画面で確認文「試験送信をオンにする」を再入力する。
 * 送り先は https://oms.srv2050136.hstgr.cloud/intake-api/test-orders に固定（本番DBの oms.orders には書かない受け口）。
 * フックは Welcart 2.12.9 の usces_action_reg_orderdata（usc-e-shop/functions/function.php の
 * usces_reg_orderdata と usces_new_orderdata から呼ばれる）。オフのときはフック自体を登録しない。
 * 在庫の書き戻しはしない。住所・電話・メールは送らない。
 */
class Luna_OMS_Order_Send {
	const OPTION       = 'luna_oms_order_send';
	const TOKEN_OPTION = 'luna_oms_order_send_token';
	const LOG_OPTION   = 'luna_oms_order_send_log';
	const CONFIRM      = '試験送信をオンにする';
	const PINNED_URL   = 'https://oms.srv2050136.hstgr.cloud/intake-api/test-orders';
	const PINNED_HOST  = 'oms.srv2050136.hstgr.cloud';
	const SOURCE       = 'https://renewal-test.luna-luce.info';
	const HOOK         = 'usces_action_reg_orderdata';

	public static function enabled() {
		return 'on' === get_option( self::OPTION, 'off' ) && '' !== (string) get_option( self::TOKEN_OPTION, '' );
	}

	/** 送り先がピンと一致しているか（定数が差し替わっていないかの守り） */
	public static function destination_ok() {
		$parts = parse_url( self::PINNED_URL );
		return is_array( $parts )
			&& 'https' === ( $parts['scheme'] ?? '' )
			&& self::PINNED_HOST === ( $parts['host'] ?? '' )
			&& '/intake-api/test-orders' === ( $parts['path'] ?? '' );
	}

	public static function init() {
		add_action( 'admin_post_luna_oms_order_send', array( __CLASS__, 'save' ) );
		if ( self::enabled() && self::destination_ok() ) {
			add_action( self::HOOK, array( __CLASS__, 'on_reg_order' ), 20, 1 );
		}
	}

	/**
	 * Welcart の $args（cart / entry / order_id / payments）から、個人情報を除いた試験用の本体を作る。
	 */
	public static function payload( $args ) {
		$args  = is_array( $args ) ? $args : array();
		$cart  = isset( $args['cart'] ) && is_array( $args['cart'] ) ? $args['cart'] : array();
		$entry = isset( $args['entry'] ) && is_array( $args['entry'] ) ? $args['entry'] : array();
		$items = array();
		foreach ( $cart as $row ) {
			$sku = isset( $row['sku'] ) && is_array( $row['sku'] ) ? $row['sku'] : array();
			$items[] = array(
				'code'  => isset( $row['sku'] ) && is_string( $row['sku'] ) ? $row['sku'] : (string) ( $sku['code'] ?? $row['sku_code'] ?? '' ),
				'name'  => (string) ( $row['name'] ?? $sku['name'] ?? '' ),
				'qty'   => (int) ( $row['quant'] ?? $row['quantity'] ?? $row['qty'] ?? 0 ),
				'price' => (float) ( $row['price'] ?? $sku['price'] ?? 0 ),
			);
		}
		$total = isset( $entry['order']['total_full_price'] ) ? (float) $entry['order']['total_full_price'] : ( isset( $entry['order']['total_price'] ) ? (float) $entry['order']['total_price'] : 0 );
		$pay   = '';
		if ( isset( $args['payments']['name'] ) ) {
			$pay = (string) $args['payments']['name'];
		} elseif ( isset( $entry['order']['payment_name'] ) ) {
			$pay = (string) $entry['order']['payment_name'];
		}
		return array(
			'source'   => self::SOURCE,
			'order_id' => (string) ( $args['order_id'] ?? '' ),
			'items'    => $items,
			'totals'   => array( 'total' => $total ),
			'payment'  => array( 'name' => $pay ),
		);
	}

	public static function on_reg_order( $args ) {
		if ( ! self::enabled() || ! self::destination_ok() ) {
			return;
		}
		$body = self::payload( $args );
		if ( '' === $body['order_id'] ) {
			return;
		}
		$token = (string) get_option( self::TOKEN_OPTION, '' );
		$res   = wp_remote_post(
			self::PINNED_URL,
			array(
				'timeout' => 8,
				'headers' => array(
					'Authorization'     => 'Bearer ' . $token,
					'Content-Type'      => 'application/json; charset=utf-8',
					'X-Luna-OMS-Source' => self::SOURCE,
				),
				'body'    => wp_json_encode( $body ),
			)
		);
		$log = array(
			'at'     => function_exists( 'current_time' ) ? current_time( 'mysql' ) : gmdate( 'Y-m-d H:i:s' ),
			'ok'     => ! is_wp_error( $res ) && (int) wp_remote_retrieve_response_code( $res ) < 300,
			'status' => is_wp_error( $res ) ? 0 : (int) wp_remote_retrieve_response_code( $res ),
			'order'  => $body['order_id'],
		);
		update_option( self::LOG_OPTION, $log, false );
	}

	public static function save() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( '権限がありません' );
		}
		check_admin_referer( 'luna_oms_order_send' );
		$want = isset( $_POST['order_send'] ) && 'on' === $_POST['order_send'] ? 'on' : 'off';
		if ( 'on' === $want ) {
			$confirm = isset( $_POST['order_send_confirm'] ) ? wp_unslash( $_POST['order_send_confirm'] ) : '';
			if ( self::CONFIRM !== $confirm ) {
				self::back( array( 'luna_msg' => 'confirm' ) );
			}
		}
		$new_token = isset( $_POST['order_send_token'] ) ? trim( (string) wp_unslash( $_POST['order_send_token'] ) ) : '';
		if ( '' !== $new_token ) {
			update_option( self::TOKEN_OPTION, $new_token, false );
		}
		if ( 'on' === $want && '' === (string) get_option( self::TOKEN_OPTION, '' ) ) {
			self::back( array( 'luna_msg' => 'token' ) );
		}
		update_option( self::OPTION, $want, false );
		self::back( array( 'luna_msg' => 'saved' ) );
	}

	private static function back( $args ) {
		wp_safe_redirect( add_query_arg( $args, admin_url( 'tools.php?page=' . Luna_OMS_Admin::SLUG ) ) );
		exit;
	}

	public static function panel() {
		$on    = 'on' === get_option( self::OPTION, 'off' );
		$token = (string) get_option( self::TOKEN_OPTION, '' );
		$log   = get_option( self::LOG_OPTION, array() );
		echo '<h2>注文の試験送信（初期オフ）</h2>';
		echo '<p>検証用サイトから OMS の試験受け口へ、注文が届くかを確かめるためのスイッチです。初期状態はオフで、オフのときは Welcart の受注フックを登録しません。オンにしても送り先は試験受け口（専用ストア）だけで、本番の受注データには書きません。住所・電話・メールは送りません。在庫も書き戻しません。</p>';
		echo '<p>送り先（固定）: <code>' . esc_html( self::PINNED_URL ) . '</code></p>';
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '"><input type="hidden" name="action" value="luna_oms_order_send">';
		if ( function_exists( 'wp_nonce_field' ) ) {
			wp_nonce_field( 'luna_oms_order_send' );
		}
		echo '<p><label><input type="radio" name="order_send" value="off"' . ( $on ? '' : ' checked' ) . '> オフ（推奨）</label><br>';
		echo '<label><input type="radio" name="order_send" value="on"' . ( $on ? ' checked' : '' ) . '> オン（試験のときだけ）</label></p>';
		echo '<p><label>オンにするときの確認文（次の文字をそのまま入力）<br><code>' . esc_html( self::CONFIRM ) . '</code><br><input type="text" name="order_send_confirm" class="regular-text" autocomplete="off"></label></p>';
		echo '<p><label>試験用トークン（OMSの環境欄と同じ値。保存済みの値は表示しません）<br><input type="password" name="order_send_token" class="regular-text" value="" autocomplete="new-password" placeholder="' . ( $token ? '設定済み。変えるときだけ入力' : '未設定' ) . '"></label></p>';
		if ( function_exists( 'submit_button' ) ) {
			submit_button( '保存', 'secondary', 'submit', false );
		} else {
			echo '<button type="submit">保存</button>';
		}
		echo '</form>';
		if ( $on && $token ) {
			echo '<p>いまの状態: <strong>オン</strong>（確認文の再入力済み・トークンあり）</p>';
		} else {
			echo '<p>いまの状態: <strong>オフ</strong></p>';
		}
		if ( is_array( $log ) && ! empty( $log['at'] ) ) {
			echo '<p>直前の送信: ' . esc_html( $log['at'] ) . ' ／ 注文 ' . esc_html( (string) ( $log['order'] ?? '' ) ) . ' ／ HTTP ' . esc_html( (string) ( $log['status'] ?? '' ) ) . ( ! empty( $log['ok'] ) ? ' ／ 成功' : ' ／ 失敗または未達' ) . '</p>';
		}
	}
}
