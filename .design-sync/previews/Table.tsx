import React from "react";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge,
} from "careand-member-web";

export const CandidateList = () => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>돌봄전문가</TableHead>
        <TableHead>평점</TableHead>
        <TableHead>입찰가</TableHead>
        <TableHead>상태</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>김간병</TableCell>
        <TableCell>4.8</TableCell>
        <TableCell>22,000원</TableCell>
        <TableCell><Badge variant="success">가성비</Badge></TableCell>
      </TableRow>
      <TableRow>
        <TableCell>이돌봄</TableCell>
        <TableCell>4.6</TableCell>
        <TableCell>26,000원</TableCell>
        <TableCell><Badge variant="outline">적정</Badge></TableCell>
      </TableRow>
      <TableRow>
        <TableCell>박케어</TableCell>
        <TableCell>4.9</TableCell>
        <TableCell>24,500원</TableCell>
        <TableCell><Badge variant="brand">단골</Badge></TableCell>
      </TableRow>
    </TableBody>
  </Table>
);
