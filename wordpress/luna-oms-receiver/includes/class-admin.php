<?php
/**
 * 管理画面「ツール → OMSから取り込む」
 * 1. OMSで書き出した site-builder-draft.json を選ぶ → 2. 何が変わるかを確認（まだ何も書かない） → 3.「この内容で登録する」
 */
class Luna_OMS_Admin {
	const SLUG = 'luna-oms-receiver';

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_post_luna_oms_preview', array( __CLASS__, 'preview' ) );
		add_action( 'admin_post_luna_oms_apply', array( __CLASS__, 'apply' ) );
		add_action( 'admin_post_luna_oms_settings', array( __CLASS__, 'settings' ) );
	}

	public static function menu() {
		add_management_page( 'OMSから取り込む', 'OMSから取り込む', 'manage_options', self::SLUG, array( __CLASS__, 'page' ) );
	}

	public static function image_base() {
		return (string) get_option( 'luna_oms_image_base', 'https://raw.githubusercontent.com/Ghodam5/lunaluce-sample/main/' );
	}

	private static function key() {
		return 'luna_oms_draft_' . get_current_user_id();
	}

	private static function back( $args ) {
		wp_safe_redirect( add_query_arg( $args, admin_url( 'tools.php?page=' . self::SLUG ) ) );
		exit;
	}

	/** ファイルを読んで、何が変わるかだけを調べる（試し） */
	public static function preview() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( '権限がありません' );
		}
		check_admin_referer( 'luna_oms_preview' );
		$file = isset( $_FILES['draft']['tmp_name'] ) ? $_FILES['draft']['tmp_name'] : '';
		$json = $file && is_uploaded_file( $file ) ? json_decode( file_get_contents( $file ), true ) : null;
		if ( ! is_array( $json ) || ( isset( $json['kind'] ) && 'luna-site-builder-draft' !== $json['kind'] ) ) {
			self::back( array( 'luna_msg' => 'bad' ) );
		}
		set_transient( self::key(), $json, HOUR_IN_SECONDS );
		$report = Luna_OMS_Writer::run( $json, true, array( 'image_base' => self::image_base() ) );
		set_transient( self::key() . '_report', $report, HOUR_IN_SECONDS );
		self::back( array( 'luna_step' => 'preview' ) );
	}

	/** 確認した内容で登録する */
	public static function apply() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( '権限がありません' );
		}
		check_admin_referer( 'luna_oms_apply' );
		$json = get_transient( self::key() );
		if ( ! is_array( $json ) ) {
			self::back( array( 'luna_msg' => 'expired' ) );
		}
		$report = Luna_OMS_Writer::run( $json, false, array( 'image_base' => self::image_base() ) );
		delete_transient( self::key() );
		set_transient( self::key() . '_report', $report, HOUR_IN_SECONDS );
		self::back( array( 'luna_step' => 'done' ) );
	}

	public static function settings() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( '権限がありません' );
		}
		check_admin_referer( 'luna_oms_settings' );
		$base = isset( $_POST['image_base'] ) ? esc_url_raw( wp_unslash( $_POST['image_base'] ) ) : '';
		update_option( 'luna_oms_image_base', $base );
		self::back( array( 'luna_msg' => 'saved' ) );
	}

	private static function table( $rows, $title ) {
		if ( ! $rows ) {
			return '';
		}
		$label = array( 'create' => '新しく登録', 'update' => '変更', 'same' => '変更なし', 'skip' => '飛ばす', 'error' => '登録できない' );
		$html  = '<h3>' . esc_html( $title ) . '</h3><table class="widefat striped"><thead><tr><th style="width:9em">どうなるか</th><th style="width:14em">商品コード</th><th>中身</th></tr></thead><tbody>';
		foreach ( $rows as $r ) {
			$html .= '<tr><td><strong>' . esc_html( $label[ $r['action'] ] ?? $r['action'] ) . '</strong></td><td><code>' . esc_html( $r['code'] ) . '</code>' . ( ! empty( $r['title'] ) ? '<br>' . esc_html( $r['title'] ) : '' ) . '</td><td>' . ( $r['changes'] ? '<ul style="margin:0">' . implode( '', array_map( function ( $c ) { return '<li>' . esc_html( $c ) . '</li>'; }, $r['changes'] ) ) . '</ul>' : '—' ) . '</td></tr>';
		}
		return $html . '</tbody></table>';
	}

	public static function page() {
		$step   = isset( $_GET['luna_step'] ) ? sanitize_key( $_GET['luna_step'] ) : '';
		$msg    = isset( $_GET['luna_msg'] ) ? sanitize_key( $_GET['luna_msg'] ) : '';
		$report = $step ? get_transient( self::key() . '_report' ) : null;
		$ready  = Luna_OMS_Writer::ready();
		$opt    = get_option( 'usces' );
		echo '<div class="wrap"><h1>OMSから取り込む</h1>';
		echo '<p>ルナルーチェOMSのサイトビルダーで「書き出す」と作られる <code>site-builder-draft.json</code> を選ぶと、Welcartの商品・在庫の状態・営業日に登録します。先に「何が変わるか」を出すので、確かめてから登録してください。</p>';
		if ( $ready ) {
			echo '<div class="notice notice-error"><p>' . esc_html( $ready ) . '</p></div>';
		}
		if ( is_array( $opt ) && isset( $opt['tax_mode'] ) && 'exclude' === $opt['tax_mode'] ) {
			echo '<div class="notice notice-warning"><p>Welcartの価格が「税抜」の設定です。OMSの価格は税込なので、登録前に設定を確かめてください。</p></div>';
		}
		$msgs = array( 'bad' => 'OMSの書き出しファイル（site-builder-draft.json）を選んでください。', 'expired' => '確認してから時間がたったので、もう一度ファイルを選んでください。', 'saved' => '設定を保存しました。', 'confirm' => '注文の試験送信をオンにするには、確認文をそのまま入力してください。オフのままです。', 'token' => 'オンにするには試験用トークンが必要です。オフのままです。' );
		if ( isset( $msgs[ $msg ] ) ) {
			echo '<div class="notice notice-' . ( 'saved' === $msg ? 'success' : 'error' ) . '"><p>' . esc_html( $msgs[ $msg ] ) . '</p></div>';
		}
		if ( is_array( $report ) ) {
			echo '<h2>' . ( 'done' === $step ? '登録しました' : '何が変わるか（まだ登録していません）' ) . '</h2>';
			if ( ! empty( $report['error'] ) ) {
				echo '<div class="notice notice-error"><p>' . esc_html( $report['error'] ) . '</p></div>';
			}
			echo self::table( $report['items'], '商品' ) . self::table( $report['stock'], '在庫の状態' ); // phpcs:ignore -- table() はすべて esc_html 済み
			if ( ! empty( $report['days'] ) ) {
				echo '<h3>営業日</h3><p>' . esc_html( $report['days']['count'] . '日分を受け取り、' . count( $report['days']['changes'] ) . '日が変わります。' ) . '</p>';
				if ( $report['days']['changes'] ) {
					echo '<ul>' . implode( '', array_map( function ( $c ) { return '<li>' . esc_html( $c['date'] . ': ' . ( $c['to'] ? '営業' : '発送のお休み' ) ); }, array_slice( $report['days']['changes'], 0, 60 ) ) ) . '</ul>';
				}
			}
			if ( 'preview' === $step && get_transient( self::key() ) ) {
				echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '"><input type="hidden" name="action" value="luna_oms_apply">';
				wp_nonce_field( 'luna_oms_apply' );
				submit_button( 'この内容でWelcartに登録する', 'primary', 'submit', false, $report['ok'] ? array() : array( 'disabled' => 'disabled' ) );
				echo $report['ok'] ? '' : ' <span>「登録できない」行を OMS で直してから、もう一度書き出してください。</span>';
				echo '</form>';
			}
			echo '<hr>';
		}
		echo '<h2>1. ファイルを選ぶ</h2><form method="post" enctype="multipart/form-data" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '"><input type="hidden" name="action" value="luna_oms_preview">';
		wp_nonce_field( 'luna_oms_preview' );
		echo '<input type="file" name="draft" accept=".json,application/json" required> ';
		submit_button( '何が変わるかを見る', 'secondary', 'submit', false );
		echo '</form>';
		echo '<h2>設定</h2><form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '"><input type="hidden" name="action" value="luna_oms_settings">';
		wp_nonce_field( 'luna_oms_settings' );
		echo '<p><label>商品写真の取り寄せ元（サイトの images/ がある場所）<br><input type="url" name="image_base" class="regular-text" value="' . esc_attr( self::image_base() ) . '"></label></p>';
		submit_button( '保存', 'secondary', 'submit', false );
		echo '</form>';
		if ( class_exists( 'Luna_OMS_Order_Send' ) ) {
			Luna_OMS_Order_Send::panel();
		}
		$log = get_option( 'luna_oms_receiver_log', array() );
		if ( $log ) {
			echo '<h2>これまでの登録</h2><table class="widefat striped"><thead><tr><th>日時</th><th>した人</th><th>商品</th><th>在庫</th><th>営業日</th></tr></thead><tbody>';
			foreach ( $log as $l ) {
				$items = array();
				foreach ( (array) $l['items'] as $k => $n ) {
					$items[] = $k . ' ' . $n;
				}
				echo '<tr><td>' . esc_html( $l['at'] ) . '</td><td>' . esc_html( $l['user'] ) . '</td><td>' . esc_html( implode( '・', $items ) ) . '</td><td>' . esc_html( $l['stock'] ) . '</td><td>' . esc_html( $l['days'] ) . '</td></tr>';
			}
			echo '</tbody></table>';
		}
		echo '</div>';
	}
}
