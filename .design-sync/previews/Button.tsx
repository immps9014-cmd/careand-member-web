import React from "react";
import { Button } from "careand-member-web";

export const Variants = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
    <Button variant="brand">매칭 요청하기</Button>
    <Button variant="primary">확인</Button>
    <Button variant="secondary">취소</Button>
    <Button variant="outline">더보기</Button>
    <Button variant="ghost">건너뛰기</Button>
    <Button variant="danger">삭제</Button>
    <Button variant="link">자세히</Button>
  </div>
);

export const Sizes = () => (
  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
    <Button variant="brand" size="sm">작게</Button>
    <Button variant="brand" size="md">기본</Button>
    <Button variant="brand" size="lg">크게</Button>
  </div>
);

export const States = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
    <Button variant="brand">활성</Button>
    <Button variant="brand" disabled>비활성</Button>
    <Button variant="outline" disabled>비활성</Button>
  </div>
);
