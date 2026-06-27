import React from "react";
import { Input } from "careand-member-web";

export const States = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 300 }}>
    <Input placeholder="이름을 입력하세요" />
    <Input defaultValue="홍길동" />
    <Input type="number" placeholder="희망 시급 (원)" defaultValue={22000} />
    <Input placeholder="비활성 입력" disabled />
  </div>
);
