<?php
/**
 * Welcart への書き込み。どの関数も $dry が true なら何も書かず、「何が変わるか」だけを返す。
 * Welcart 2.x の関数（wel_get_id_by_item_code / wel_get_item / wel_update_item_data / wel_get_skus /
 * wel_add_sku_data / wel_update_sku_data_by_id）を使い、Welcart のテーブルを直接は触らない。
 */
class Luna_OMS_Writer {
	/** 新しく作る商品の項目の初期値（Welcart の商品編集画面で空のまま保存したときと同じ） */
	const ITEM_DEFAULTS = array(
		'itemRestriction'       => '',
		'itemPointrate'         => 0,
		'itemGpNum1'            => 0,
		'itemGpNum2'            => 0,
		'itemGpNum3'            => 0,
		'itemGpDis1'            => 0,
		'itemGpDis2'            => 0,
		'itemGpDis3'            => 0,
		'itemOrderAcceptable'   => 0,
		'itemShipping'          => 0,
		'itemDeliveryMethod'    => array(),
		'itemShippingCharge'    => 0,
		'itemIndividualSCharge' => 0,
	);
	const SKU_DEFAULTS = array(
		'cprice'    => 0,
		'unit'      => '個',
		'stocknum'  => '',
		'gp'        => 0,
		'taxrate'   => '',
		'size'      => '',
		'weight'    => '',
		'pict_id'   => '',
		'advance'   => '',
		'paternkey' => '',
	);

	public static function ready() {
		$need = array( 'wel_get_id_by_item_code', 'wel_get_item', 'wel_update_item_data', 'wel_get_skus', 'wel_add_sku_data', 'wel_update_sku_data_by_id' );
		$missing = array();
		foreach ( $need as $f ) {
			if ( ! function_exists( $f ) ) {
				$missing[] = $f;
			}
		}
		return $missing ? 'Welcart 2.x が有効になっていません（' . implode( ', ', $missing ) . '）' : '';
	}

	public static function zaiko_labels() {
		$z = get_option( 'usces_zaiko_status' );
		return is_array( $z ) ? $z : array();
	}

	public static function post_id( $code ) {
		$id = wel_get_id_by_item_code( $code, false );
		return $id ? (int) $id : 0;
	}

	/** 下書きファイル（site-builder-draft.json）をまとめて処理する */
	public static function run( $draft, $dry, $opts = array() ) {
		$err = self::ready();
		if ( $err ) {
			return array( 'ok' => false, 'error' => $err, 'items' => array() );
		}
		$labels  = self::zaiko_labels();
		$uploads = array();
		foreach ( isset( $draft['uploads'] ) && is_array( $draft['uploads'] ) ? $draft['uploads'] : array() as $u ) {
			if ( isset( $u['path'], $u['dataUrl'] ) ) {
				$uploads[ $u['path'] ] = $u['dataUrl'];
			}
		}
		$report = array( 'ok' => true, 'dry' => (bool) $dry, 'items' => array(), 'stock' => array(), 'days' => null );
		$rows   = array_merge( isset( $draft['products'] ) && is_array( $draft['products'] ) ? $draft['products'] : array(), isset( $draft['edits'] ) && is_array( $draft['edits'] ) ? $draft['edits'] : array() );
		$done   = array();
		foreach ( $rows as $row ) {
			$m = Luna_OMS_Mapper::map_row( $row, $labels );
			if ( $m['errors'] ) {
				$report['items'][] = array( 'code' => $m['code'], 'title' => $m['post']['post_title'], 'action' => 'error', 'changes' => $m['errors'] );
				$report['ok']      = false;
				continue;
			}
			$report['items'][]                     = self::product( $m, $dry, $uploads, $opts );
			$done[ strtolower( $m['code'] ) ] = true;
		}
		// 在庫の状態だけを切り替えた商品（商品の登録・編集に含まれるものは上で済んでいる）
		foreach ( isset( $draft['stock'] ) && is_array( $draft['stock'] ) ? $draft['stock'] : array() as $s ) {
			$code = isset( $s['code'] ) ? (string) $s['code'] : '';
			if ( '' === $code || isset( $done[ strtolower( $code ) ] ) ) {
				if ( '' === $code ) {
					$report['stock'][] = array( 'code' => '', 'id' => isset( $s['id'] ) ? $s['id'] : '', 'action' => 'skip', 'changes' => array( '商品コードが書き出しにありません（OMS 2.16 以降で書き出し直してください）' ) );
				}
				continue;
			}
			$report['stock'][] = self::stock( $code, isset( $s['status'] ) ? $s['status'] : 'in', isset( $s['eta'] ) ? $s['eta'] : '', $dry, $labels );
		}
		if ( ! empty( $draft['businessDays'] ) && is_array( $draft['businessDays'] ) ) {
			$report['days'] = self::business_days( $draft['businessDays'], $dry );
		}
		if ( ! $dry ) {
			self::log( $report );
		}
		return $report;
	}

	/** 1商品: 無ければ作り、あれば違うところだけ直す */
	public static function product( $m, $dry, $uploads, $opts ) {
		$post_id = self::post_id( $m['code'] );
		$out     = array( 'code' => $m['code'], 'title' => $m['post']['post_title'], 'action' => $post_id ? 'update' : 'create', 'post_id' => $post_id, 'changes' => array() );
		$c       = &$out['changes'];
		if ( ! $post_id ) {
			$c[] = '新しく登録（' . ( 'publish' === $m['post']['post_status'] ? '公開' : '下書き' ) . '）';
			foreach ( $m['skus'] as $s ) {
				$c[] = '種類 ' . $s['code'] . '「' . $s['name'] . '」 ' . number_format( $s['price'] ) . '円';
			}
			if ( $m['photos'] ) {
				$c[] = '写真 ' . count( $m['photos'] ) . '枚';
			}
			if ( $dry ) {
				return $out;
			}
			$post_id = wp_insert_post(
				array(
					'post_type'      => 'post',
					'post_mime_type' => 'item',
					'post_title'     => $m['post']['post_title'],
					'post_content'   => $m['post']['post_content'],
					'post_status'    => $m['post']['post_status'],
					'post_category'  => defined( 'USCES_ITEM_CAT_PARENT_ID' ) && USCES_ITEM_CAT_PARENT_ID ? array( (int) USCES_ITEM_CAT_PARENT_ID ) : array(),
				),
				true
			);
			if ( is_wp_error( $post_id ) ) {
				$out['action'] = 'error';
				$c[]           = '登録できませんでした: ' . $post_id->get_error_message();
				return $out;
			}
			$out['post_id'] = $post_id;
		} else {
			$post = get_post( $post_id );
			foreach ( array( 'post_title' => '商品名', 'post_status' => '公開の状態', 'post_content' => '説明' ) as $k => $label ) {
				if ( (string) $post->$k !== (string) $m['post'][ $k ] ) {
					$c[] = $label . 'を変更' . ( 'post_content' === $k ? '' : '（' . $post->$k . ' → ' . $m['post'][ $k ] . '）' );
				}
			}
			if ( ! $dry && $c ) {
				wp_update_post( array_merge( array( 'ID' => $post_id ), $m['post'] ) );
			}
		}
		// 商品の項目（商品コード・商品名。ほかの項目は Welcart にあるものを残す）
		$item = wel_get_item( $post_id, false );
		$item = is_array( $item ) ? $item : array();
		$base = array_merge( self::ITEM_DEFAULTS, $item );
		$next = array_merge( $base, $m['item'] );
		if ( ( $item['itemName'] ?? '' ) !== $next['itemName'] && 'update' === $out['action'] ) {
			$c[] = 'Welcartの商品名を変更';
		}
		// 種類（SKU）: コードで突き合わせる。Welcart にだけある種類は消さずに知らせる（消すのは担当者が画面で）
		$current = wel_get_skus( $post_id, 'sort', false );
		$current = is_array( $current ) ? $current : array();
		$by_code = array();
		foreach ( $current as $s ) {
			$by_code[ strtolower( (string) $s['code'] ) ] = $s;
		}
		$keep = array();
		foreach ( $m['skus'] as $s ) {
			$k        = strtolower( $s['code'] );
			$keep[ $k ] = true;
			if ( isset( $by_code[ $k ] ) ) {
				$old  = $by_code[ $k ];
				$diff = array();
				if ( (float) $old['price'] !== (float) $s['price'] ) {
					$diff[] = '価格 ' . number_format( (float) $old['price'] ) . '→' . number_format( $s['price'] ) . '円';
				}
				if ( (string) $old['name'] !== (string) $s['name'] ) {
					$diff[] = '名前「' . $old['name'] . '」→「' . $s['name'] . '」';
				}
				if ( (int) $old['stock'] !== (int) $s['stock'] ) {
					$diff[] = '在庫の状態 ' . (int) $old['stock'] . '→' . (int) $s['stock'];
				}
				if ( $diff ) {
					if ( 'update' === $out['action'] ) {
						$c[] = '種類 ' . $s['code'] . ': ' . implode( '・', $diff );
					}
					if ( ! $dry ) {
						$meta_id = $old['meta_id'];
						$merged  = array_merge( $old, array( 'name' => $s['name'], 'price' => $s['price'], 'stock' => $s['stock'], 'sort' => $s['sort'] ) );
						unset( $merged['meta_id'] );
						wel_update_sku_data_by_id( $meta_id, $post_id, $merged );
					}
				}
			} else {
				if ( 'update' === $out['action'] ) {
					$c[] = '種類を追加 ' . $s['code'] . '「' . $s['name'] . '」 ' . number_format( $s['price'] ) . '円';
				}
				if ( ! $dry ) {
					wel_add_sku_data( $post_id, array_merge( self::SKU_DEFAULTS, $s ) );
				}
			}
		}
		foreach ( $by_code as $k => $s ) {
			if ( ! isset( $keep[ $k ] ) ) {
				$c[] = '注意: Welcartにだけある種類 ' . $s['code'] . '「' . $s['name'] . '」はそのまま残します';
			}
		}
		// 写真: 並びが変わったときだけ入れ直す（このプラグインが入れた写真だけを差し替える）
		$before = get_post_meta( $post_id, '_luna_oms_photos', true );
		$before = is_array( $before ) ? $before : array();
		$no_picts = $m['photos'] && empty( array_filter( (array) ( $item['itemPicts'] ?? array() ) ) );
		if ( $before !== $m['photos'] || $no_picts ) {
			if ( 'update' === $out['action'] ) {
				$c[] = '写真を入れ直す（' . count( $before ) . '枚 → ' . count( $m['photos'] ) . '枚）';
			}
			if ( ! $dry ) {
				$res = self::photos( $post_id, $m['code'], $m['photos'], $uploads, isset( $opts['image_base'] ) ? $opts['image_base'] : '' );
				foreach ( $res['msgs'] as $msg ) {
					$c[] = $msg;
				}
				// Welcart 2.x は商品の写真を itemPicts（メディアの番号の並び。1つ目がメイン）で持つ
				$next['itemPicts'] = $res['ids'];
			}
		}
		if ( ! $dry ) {
			unset( $next['post_id'] );
			wel_update_item_data( $next, $post_id );
		}
		foreach ( $m['meta'] as $k => $v ) {
			if ( 'update' === $out['action'] && '_luna_oms_minq' === $k && (string) get_post_meta( $post_id, $k, true ) !== (string) $v && '' !== (string) get_post_meta( $post_id, $k, true ) ) {
				$c[] = '最低数量 ' . get_post_meta( $post_id, $k, true ) . '→' . $v;
			}
			if ( ! $dry ) {
				update_post_meta( $post_id, $k, $v );
			}
		}
		if ( 'update' === $out['action'] && ! $c ) {
			$out['action'] = 'same';
		}
		if ( ! $dry ) {
			clean_post_cache( $post_id );
		}
		return $out;
	}

	/** 写真を入れる。1枚目は「商品コード」、2枚目からは「商品コード__1」…の題名にする（Welcart が商品の写真として探す名前） */
	public static function photos( $post_id, $code, $photos, $uploads, $image_base ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';
		$msgs = array();
		$old  = get_posts( array( 'post_type' => 'attachment', 'post_status' => 'any', 'numberposts' => -1, 'meta_key' => '_luna_oms_photo_for', 'meta_value' => (string) $post_id, 'fields' => 'ids' ) );
		foreach ( $old as $aid ) {
			wp_delete_attachment( $aid, true );
		}
		$done = array();
		$ids  = array();
		foreach ( array_values( $photos ) as $i => $src ) {
			$tmp = self::fetch_image( $src, $uploads, $image_base );
			if ( is_wp_error( $tmp ) ) {
				$msgs[] = '写真 ' . $src . ' を取り込めませんでした: ' . $tmp->get_error_message();
				continue;
			}
			$title = 0 === $i ? $code : $code . '__' . $i;
			$file  = array( 'name' => $title . '.' . strtolower( pathinfo( $src, PATHINFO_EXTENSION ) ), 'tmp_name' => $tmp );
			$aid   = media_handle_sideload( $file, $post_id, $title );
			if ( is_wp_error( $aid ) ) {
				@unlink( $tmp );
				$msgs[] = '写真 ' . $src . ' を登録できませんでした: ' . $aid->get_error_message();
				continue;
			}
			wp_update_post( array( 'ID' => $aid, 'post_title' => $title ) );
			update_post_meta( $aid, '_luna_oms_photo_for', (string) $post_id );
			update_post_meta( $aid, '_luna_oms_src', $src );
			if ( 0 === $i ) {
				set_post_thumbnail( $post_id, $aid );
			}
			$done[] = $src;
			$ids[]  = (int) $aid;
		}
		update_post_meta( $post_id, '_luna_oms_photos', $done === $photos ? $photos : $done );
		return array( 'msgs' => $msgs, 'ids' => $ids );
	}

	/** 写真の中身: 取り込み画像は下書きの中のデータから、サイトの画像は取り寄せ元（image_base）から */
	public static function fetch_image( $src, $uploads, $image_base ) {
		$tmp = wp_tempnam( basename( $src ) );
		if ( isset( $uploads[ $src ] ) ) {
			if ( ! preg_match( '#^data:image/(jpeg|png|gif|webp);base64,(.+)$#', $uploads[ $src ], $mm ) ) {
				return new WP_Error( 'luna', '画像のデータが壊れています' );
			}
			file_put_contents( $tmp, base64_decode( $mm[2] ) );
			return $tmp;
		}
		if ( '' === $image_base ) {
			return new WP_Error( 'luna', '画像の取り寄せ元が設定されていません' );
		}
		@unlink( $tmp );
		return download_url( trailingslashit( $image_base ) . ltrim( $src, '/' ), 60 );
	}

	/** 在庫の状態だけを変える（その商品のすべての種類） */
	public static function stock( $code, $status, $eta, $dry, $labels ) {
		$post_id = self::post_id( $code );
		$out     = array( 'code' => $code, 'action' => $post_id ? 'update' : 'skip', 'changes' => array() );
		if ( ! $post_id ) {
			$out['changes'][] = 'Welcartにこの商品コードがありません';
			return $out;
		}
		$to = Luna_OMS_Mapper::stock_index( $status, $labels );
		foreach ( (array) wel_get_skus( $post_id, 'sort', false ) as $s ) {
			if ( (int) $s['stock'] === $to ) {
				continue;
			}
			$out['changes'][] = '種類 ' . $s['code'] . ': 在庫の状態 ' . ( $labels[ (int) $s['stock'] ] ?? $s['stock'] ) . ' → ' . ( $labels[ $to ] ?? $to );
			if ( ! $dry ) {
				$meta_id = $s['meta_id'];
				$s['stock'] = $to;
				unset( $s['meta_id'] );
				wel_update_sku_data_by_id( $meta_id, $post_id, $s );
			}
		}
		if ( ! $dry ) {
			update_post_meta( $post_id, '_luna_oms_eta', 'wait' === $status ? (string) $eta : '' );
			clean_post_cache( $post_id );
		}
		if ( ! $out['changes'] ) {
			$out['action'] = 'same';
		}
		return $out;
	}

	/**
	 * 営業日。OMS が正: { holidays: ["2026-12-29", …], from: "2026-11-01", to: "2027-10-31" } の期間を、
	 * 休み=0・それ以外=1 で上書きする（{ days: {"日付": 0|1} } の形も受ける）
	 */
	public static function business_days( $in, $dry ) {
		$days = array();
		if ( isset( $in['days'] ) && is_array( $in['days'] ) ) {
			$days = $in['days'];
		} elseif ( isset( $in['from'], $in['to'] ) ) {
			$hol = array_flip( isset( $in['holidays'] ) && is_array( $in['holidays'] ) ? $in['holidays'] : array() );
			$t   = strtotime( $in['from'] . ' 00:00:00 UTC' );
			$end = strtotime( $in['to'] . ' 00:00:00 UTC' );
			for ( $n = 0; $t && $end && $t <= $end && $n < 800; $n++, $t += 86400 ) {
				$d          = gmdate( 'Y-m-d', $t );
				$days[ $d ] = isset( $hol[ $d ] ) ? 0 : 1;
			}
		}
		$opt = get_option( 'usces' );
		$opt = is_array( $opt ) ? $opt : array();
		$res = Luna_OMS_Mapper::merge_business_days( isset( $opt['business_days'] ) ? $opt['business_days'] : array(), $days );
		if ( ! $dry && $res['changes'] ) {
			$opt['business_days'] = $res['days'];
			update_option( 'usces', $opt );
		}
		return array( 'count' => count( $days ), 'changes' => $res['changes'] );
	}

	/** 登録の記録（最新20件）。誰がいつ何件を登録したか */
	public static function log( $report ) {
		$log   = get_option( 'luna_oms_receiver_log', array() );
		$log   = is_array( $log ) ? $log : array();
		$count = array();
		foreach ( $report['items'] as $i ) {
			$count[ $i['action'] ] = ( $count[ $i['action'] ] ?? 0 ) + 1;
		}
		array_unshift(
			$log,
			array(
				'at'    => current_time( 'mysql' ),
				'user'  => wp_get_current_user()->user_login,
				'items' => $count,
				'stock' => count( $report['stock'] ),
				'days'  => $report['days'] ? count( $report['days']['changes'] ) : 0,
			)
		);
		update_option( 'luna_oms_receiver_log', array_slice( $log, 0, 20 ), false );
	}
}
