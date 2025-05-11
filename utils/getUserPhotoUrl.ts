// Sesuaikan BASE_URL dengan domain/server Anda, atau ambil dari env saat deploy/production
const BASE_URL = process.env.BASE_URL || "https://anonchatku.space/api";

export function getUserPhotoUrl(userId: string, type: "profile" | "background") {
    return `${BASE_URL}/user/${userId}/photo?type=${type}`;
}