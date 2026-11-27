<?php
/**
 * OMSの書き出し（site-builder-draft.json の products / edits の1行）を Welcart の形に直す。
 * WordPress の関数は使わない（tests/run.php でそのまま確かめられるように）。
 */
class Luna_OMS_Mapper {
	/** OMSの在庫の状態 → Welcartの在庫状態の名前（usces_zaiko_status の文字で探す） */
	const STOCK_LABELS = array(
		'in'   => array( '在庫有り', '在庫あり' ),
		'few'  => array( '在庫僅少', '残りわずか' ),
		'wait' => array( '入荷待ち' ),
		'out'  => array( '売切れ', '売り切れ', '在庫切れ' ),
		'end'  => array( '廃盤', '販売終了' ),
	);
	/** 見つからないときの番号（Welcart の初期値の並び） */
	const STOCK_FALLBACK = array( 'in' => 0, 'few' => 1, 'out' => 2, 'wait' => 3, 'end' => 4 );

	/** 在庫状態の番号。$labels は Welcart の usces_zaiko_status（番号 => 名前） */
	public static function stock_index( $status, $labels ) {
		$status = isset( self::STOCK_LABELS[ $status ] ) ? $status : 'in';
		if ( is_array( $labels ) ) {
			foreach ( $labels as $index => $label ) {
				foreach ( self::STOCK_LABELS[ $status ] as $want ) {
					if ( false !== mb_strpos( (string) $label, $want ) ) {
						return (int) $index;
					}
				}
			}
		}
		return self::STOCK_FALLBACK[ $status ];
	}

	public static function h( $s ) {
		return htmlspecialchars( (string) $s, ENT_QUOTES, 'UTF-8' );
	}

	/** 商品ページの本文: 説明 → 仕様の表 → 注意事項 */
	public static function content( $p ) {
		$html = '';
		if ( ! empty( $p['description'] ) ) {
			$html .= '<p>' . nl2br( self::h( trim( $p['description'] ) ), false ) . "</p>\n";
		}
		$rows = array();
		foreach ( array( 'contents' => '内容', 'size' => 'サイズ', 'material' => '素材', 'expiry' => '賞味期限', 'allergens' => 'アレルギー', 'storage' => '保存方法' ) as $k => $label ) {
			if ( isset( $p[ $k ] ) && '' !== trim( (string) $p[ $k ] ) ) {
				$rows[] = '<tr><th>' . self::h( $label ) . '</th><td>' . nl2br( self::h( trim( $p[ $k ] ) ), false ) . '</td></tr>';
			}
		}
		if ( $rows ) {
			$html .= '<table class="luna-spec">' . implode( '', $rows ) . "</table>\n";
		}
		if ( ! empty( $p['notice'] ) ) {
			$html .= '<p class="luna-notice">' . nl2br( self::h( trim( $p['notice'] ) ), false ) . "</p>\n";
		}
		return $html;
	}

	/**
	 * 1行を直す。戻り値: post（投稿）・item（Welcartの商品の項目）・skus・photos・meta・errors
	 * $row = { active, product:{id, code, title, price, skus[{code,t,price}], ...}, photos[], stock{status,eta}, edit }
	 */
	/** 商品コードも商品名もない空の行（OMSで「新しい商品」を足したまま書いていない下書きなど） */
	public static function is_blank_row( $row ) {
		$p     = isset( $row['product'] ) && is_array( $row['product'] ) ? $row['product'] : array();
		$code  = isset( $p['code'] ) ? trim( (string) $p['code'] ) : '';
		$title = isset( $p['title'] ) ? trim( (string) $p['title'] ) : '';
		return '' === $code && '' === $title;
	}

	public static function map_row( $row, $zaiko_labels ) {
		$errors = array();
		$p      = isset( $row['product'] ) && is_array( $row['product'] ) ? $row['product'] : array();
		$code   = isset( $p['code'] ) ? trim( (string) $p['code'] ) : '';
		$title  = isset( $p['title'] ) ? trim( (string) $p['title'] ) : '';
		if ( '' === $code || ! preg_match( '/^[A-Za-z0-9][A-Za-z0-9_.\-]{0,63}$/', $code ) ) {
			$errors[] = '商品コードがありません・使えない文字があります: ' . $code;
		}
		if ( '' === $title ) {
			$errors[] = '商品名がありません: ' . $code;
		}
		$skus_in = isset( $p['skus'] ) && is_array( $p['skus'] ) ? $p['skus'] : array();
		if ( ! $skus_in ) {
			$errors[] = '種類（SKU）がありません: ' . $code;
		}
		$status = isset( $row['stock']['status'] ) ? $row['stock']['status'] : 'in';
		$zaiko  = self::stock_index( $status, $zaiko_labels );
		$skus   = array();
		$seen   = array();
		foreach ( array_values( $skus_in ) as $i => $s ) {
			$sku_code = isset( $s['code'] ) && '' !== trim( (string) $s['code'] ) ? trim( (string) $s['code'] ) : $code . ( count( $skus_in ) > 1 ? '-' . ( $i + 1 ) : '' );
			if ( isset( $seen[ strtolower( $sku_code ) ] ) ) {
				$errors[] = '同じ種類のコードが2つあります: ' . $sku_code;
			}
			$seen[ strtolower( $sku_code ) ] = true;
			$price = isset( $s['price'] ) ? (float) $s['price'] : -1;
			if ( $price < 0 ) {
				$errors[] = '価格がありません: ' . $sku_code;
			}
			$skus[] = array(
				'code'  => $sku_code,
				'name'  => isset( $s['t'] ) && '' !== trim( (string) $s['t'] ) ? trim( (string) $s['t'] ) : $title,
				'price' => $price,
				'stock' => $zaiko,
				'sort'  => $i,
			);
		}
		$photos = array();
		$list   = isset( $row['photos'] ) && is_array( $row['photos'] ) && $row['photos'] ? $row['photos'] : ( ! empty( $p['image'] ) ? array( $p['image'] ) : array() );
		foreach ( $list as $src ) {
			$src = (string) $src;
			if ( preg_match( '#^images/[A-Za-z0-9_./\-]+\.(jpe?g|png|gif|webp)$#i', $src ) && false === strpos( $src, '..' ) && ! in_array( $src, $photos, true ) ) {
				$photos[] = $src;
			}
		}
		$active = ! isset( $row['active'] ) || false !== $row['active'];
		return array(
			'code'   => $code,
			'post'   => array(
				'post_title'   => $title,
				'post_content' => self::content( $p ),
				'post_status'  => $active && 'end' !== $status ? 'publish' : 'draft',
			),
			'item'   => array(
				'itemCode' => $code,
				'itemName' => $title,
			),
			'skus'   => $skus,
			'photos' => array_slice( $photos, 0, 20 ),
			'meta'   => array(
				'_luna_oms_id'   => isset( $p['id'] ) ? (string) $p['id'] : '',
				'_luna_oms_minq' => isset( $p['minq'] ) ? (int) $p['minq'] : 1,
				'_luna_oms_eta'  => 'wait' === $status && ! empty( $row['stock']['eta'] ) ? (string) $row['stock']['eta'] : '',
			),
			'errors' => $errors,
		);
	}

	/** 営業日: { "2026-12-29": 0, ... }（1=営業・0=発送休み）を Welcart の business_days[年][月][日] に入れる */
	public static function merge_business_days( $current, $days ) {
		$current = is_array( $current ) ? $current : array();
		$changes = array();
		foreach ( (array) $days as $date => $value ) {
			if ( ! preg_match( '/^(\d{4})-(\d{2})-(\d{2})$/', (string) $date, $m ) || ! checkdate( (int) $m[2], (int) $m[3], (int) $m[1] ) ) {
				continue;
			}
			$y = (int) $m[1];
			$n = (int) $m[2];
			$d = (int) $m[3];
			$v = (int) $value ? 1 : 0;
			$before = isset( $current[ $y ][ $n ][ $d ] ) ? (int) $current[ $y ][ $n ][ $d ] : 1;
			if ( $before !== $v ) {
				$changes[] = array( 'date' => $date, 'from' => $before, 'to' => $v );
			}
			$current[ $y ][ $n ][ $d ] = $v;
		}
		return array( 'days' => $current, 'changes' => $changes );
	}
}
