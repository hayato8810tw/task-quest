"use client";

import { useEffect } from "react";
import { API_BASE_URL } from "@/lib/api";

const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000; // 14分 (15分スリープ対策)

/**
 * バックエンドのスリープを防ぐために定期的にPingを送信するコンポーネント
 * ユーザーの操作がなくても14分ごとにヘルスチェックエンドポイントを叩く
 */
export function KeepAlive() {
    useEffect(() => {
        const ping = async () => {
            try {
                // キャッシュを防ぐためにタイムスタンプを付与しても良いが、headersで制御
                await fetch(`${API_BASE_URL}/health`, {
                    method: 'GET',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    },
                    // ユーザー体験を阻害しないよう、重要でないリクエストとしてマーク（ブラウザサポートがあれば）
                    // priority: 'low' 
                });
            } catch (error) {
                // エラーが発生してもユーザーには通知せず、静かに終了
            }
        };

        // 14分ごとに実行
        const intervalId = setInterval(ping, KEEP_ALIVE_INTERVAL);

        // クリーンアップ
        return () => clearInterval(intervalId);
    }, []);

    // UIには何も表示しない
    return null;
}
