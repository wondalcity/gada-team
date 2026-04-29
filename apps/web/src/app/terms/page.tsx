"use client";

import * as React from "react";
import Link from "next/link";
import { HardHat, ChevronLeft } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function TermsPage() {
  const t = useT();
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 shadow-sm">
              <HardHat className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-base font-bold text-neutral-900">
              가다<span className="font-black text-primary-500"> Team</span>
            </span>
          </Link>
          <Link
            href="/"
            className="ml-auto flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
          >
            <ChevronLeft className="h-4 w-4" />
            홈으로
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="mb-2 text-2xl font-extrabold text-neutral-950">이용약관</h1>
        <p className="mb-8 text-sm text-neutral-500">최종 업데이트: 2025년 1월 1일</p>

        <div className="space-y-8 text-sm leading-relaxed text-neutral-700">
          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">제1조 (목적)</h2>
            <p>
              본 약관은 GADA Inc.(이하 "회사")가 운영하는 가다 Team(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임 사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">제2조 (정의)</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>"서비스"란 회사가 제공하는 건설 현장 전문 인력 매칭 플랫폼 및 관련 제반 서비스를 의미합니다.</li>
              <li>"이용자"란 본 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.</li>
              <li>"회원"이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 정보를 지속적으로 제공받으며, 회사가 제공하는 서비스를 계속적으로 이용할 수 있는 자를 말합니다.</li>
              <li>"근로자"란 서비스를 통해 건설 현장 취업을 원하는 회원을 의미합니다.</li>
              <li>"팀장"이란 근로자 팀을 결성하여 업체에게 팀 단위로 지원할 수 있는 회원을 의미합니다.</li>
              <li>"업체"란 건설 현장 인력 채용을 목적으로 서비스를 이용하는 기업 또는 개인 회원을 의미합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">제3조 (약관의 효력 및 변경)</h2>
            <p className="mb-2">
              본 약관은 서비스 화면에 게시하거나 기타의 방법으로 공지함으로써 효력을 발생합니다.
            </p>
            <p>
              회사는 필요하다고 인정되는 경우 본 약관을 변경할 수 있으며, 변경된 약관은 서비스 내에서 공지함으로써 효력을 발생합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">제4조 (서비스의 제공)</h2>
            <p className="mb-2">회사는 다음 서비스를 제공합니다:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li>건설 현장 구인구직 공고 게시 및 검색 서비스</li>
              <li>근로자 팀 결성 및 팀 단위 지원 서비스</li>
              <li>업체-근로자/팀 간 채팅 및 제안 서비스</li>
              <li>근로자 프로필 관리 (자격증, 경력, 장비 등)</li>
              <li>전자계약 체결 서비스</li>
              <li>출퇴근 관리 서비스</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">제5조 (회원가입)</h2>
            <p className="mb-2">
              이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.
            </p>
            <p>
              회원은 가입 시 등록한 정보에 변경이 생긴 경우, 즉시 서비스 내 정보수정을 통해 변경사항을 등록하여야 합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">제6조 (포인트 정책)</h2>
            <p className="mb-2">
              서비스 내 일부 기능(예: 업체의 팀장 채팅 개설, 팀장의 팀원 채팅 개설)은 포인트를 소모합니다. 포인트 관련 세부 사항은 다음과 같습니다:
            </p>
            <ul className="space-y-2 list-disc pl-5">
              <li>새로운 채팅방 개설 시 1포인트가 차감됩니다.</li>
              <li>기존에 채팅 중인 팀과의 대화는 추가 포인트가 소모되지 않습니다.</li>
              <li>포인트는 별도 충전 또는 구독을 통해 획득할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">제7조 (이용자 의무)</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>이용자는 본 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 주의사항을 준수하여야 합니다.</li>
              <li>이용자는 타인의 정보를 도용하거나 허위 정보를 등록해서는 안 됩니다.</li>
              <li>이용자는 서비스를 통해 취득한 정보를 회사의 사전 동의 없이 복제, 배포하거나 상업적 목적으로 이용해서는 안 됩니다.</li>
              <li>이용자는 서비스 이용과 관련하여 부정한 행위를 해서는 안 됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">제8조 (서비스 이용 제한)</h2>
            <p>
              회사는 이용자가 본 약관을 위반하거나 서비스의 정상적인 운영을 방해한 경우, 경고, 일시 정지, 영구 이용정지 등으로 서비스 이용을 단계적으로 제한할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">제9조 (면책조항)</h2>
            <p className="mb-2">
              회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
            </p>
            <p>
              회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">제10조 (분쟁 해결)</h2>
            <p>
              서비스 이용으로 발생한 분쟁에 대해 소송이 제기될 경우 회사의 본사 소재지를 관할하는 법원을 관할 법원으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">부칙</h2>
            <p>본 약관은 2025년 1월 1일부터 시행됩니다.</p>
          </section>
        </div>

        <div className="mt-10 border-t border-neutral-200 pt-6 text-center">
          <p className="text-xs text-neutral-400">© 2025 GADA Inc. All rights reserved.</p>
          <div className="mt-2 flex justify-center gap-4 text-xs text-neutral-400">
            <Link href="/privacy" className="hover:text-neutral-600 underline">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-neutral-600 underline">이용약관</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
