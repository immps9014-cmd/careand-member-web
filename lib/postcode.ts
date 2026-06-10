const SCRIPT_SRC = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
let loader: Promise<void> | null = null;

function loadPostcodeScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("브라우저 환경이 아닙니다"));
  if ((window as any).daum?.Postcode) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = SCRIPT_SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      loader = null;
      reject(new Error("우편번호 서비스를 불러오지 못했습니다"));
    };
    document.head.appendChild(el);
  });
  return loader;
}

export interface PostcodeResult {
  address: string; // 도로명 우선, 없으면 지번
  roadAddress: string;
  jibunAddress: string;
  zonecode: string; // 우편번호
}

/** Daum(카카오) 우편번호 검색 팝업. 선택 시 결과, 닫으면 null 반환. (API 키 불필요) */
export async function openPostcode(): Promise<PostcodeResult | null> {
  await loadPostcodeScript();
  return new Promise<PostcodeResult | null>((resolve) => {
    let done = false;
    new (window as any).daum.Postcode({
      oncomplete: (data: any) => {
        done = true;
        resolve({
          address: data.roadAddress || data.address || data.jibunAddress,
          roadAddress: data.roadAddress || "",
          jibunAddress: data.jibunAddress || "",
          zonecode: data.zonecode || "",
        });
      },
      onclose: () => {
        if (!done) resolve(null);
      },
    }).open();
  });
}
