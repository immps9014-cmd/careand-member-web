import React from "react";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Button, Badge,
} from "careand-member-web";

export const MatchRequest = () => (
  <Card style={{ maxWidth: 360 }}>
    <CardHeader>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <CardTitle>홍어머님</CardTitle>
        <Badge variant="success">매칭완료</Badge>
      </div>
      <CardDescription>방문요양 · 2026-07-01 23:00 · 4시간</CardDescription>
    </CardHeader>
    <CardContent>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
        <span style={{ color: "#6b7280" }}>합의 시급</span>
        <strong style={{ color: "#2E7D4F" }}>21,900원</strong>
      </div>
    </CardContent>
    <CardFooter>
      <Button variant="brand" size="sm">상세 보기</Button>
    </CardFooter>
  </Card>
);

export const Simple = () => (
  <Card style={{ maxWidth: 320 }}>
    <CardHeader>
      <CardTitle>이번 달 수입</CardTitle>
      <CardDescription>완료 케어 12건</CardDescription>
    </CardHeader>
    <CardContent>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#1C2030" }}>1,840,000원</div>
    </CardContent>
  </Card>
);
