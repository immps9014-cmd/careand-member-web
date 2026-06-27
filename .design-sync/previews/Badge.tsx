import React from "react";
import { Badge } from "careand-member-web";

export const Variants = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
    <Badge variant="brand">매칭중</Badge>
    <Badge variant="success">매칭완료</Badge>
    <Badge variant="warn">대기</Badge>
    <Badge variant="danger">취소</Badge>
    <Badge variant="info">신규</Badge>
    <Badge variant="solid">상주</Badge>
    <Badge variant="outline">방문요양</Badge>
    <Badge variant="ai">AI 추천</Badge>
  </div>
);
