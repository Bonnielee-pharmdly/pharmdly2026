// 식약처 e약은요 API 프록시 — 포장지 이미지 URL 조회
// 브라우저에서 직접 apis.data.go.kr 호출 시 CORS 차단 → 서버 사이드로 우회
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const itemSeq = searchParams.get("itemSeq");
  const apiKey = process.env.NEXT_PUBLIC_MFDS_API_KEY || "";

  if (!itemSeq || !apiKey) {
    return Response.json({ image: null });
  }

  try {
    const url =
      `https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList` +
      `?serviceKey=${apiKey}&itemSeq=${itemSeq}&type=json&numOfRows=1&pageNo=1`;
    const res = await fetch(url, { next: { revalidate: 86400 } }); // 24h 캐시
    const json = await res.json();
    const image = json?.body?.items?.[0]?.ITEM_IMAGE || null;
    return Response.json({ image });
  } catch {
    return Response.json({ image: null });
  }
}
