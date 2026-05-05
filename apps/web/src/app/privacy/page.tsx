"use client";

import * as React from "react";
import Link from "next/link";
import { HardHat, ChevronLeft } from "lucide-react";

export default function PrivacyPage() {
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
        <h1 className="mb-2 text-2xl font-extrabold text-neutral-950">개인정보처리방침</h1>
        <p className="mb-8 text-sm text-neutral-500">최종 업데이트: 2025년 1월 1일</p>

        <div className="space-y-8 text-sm leading-relaxed text-neutral-700">
          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">1. 개인정보의 수집 및 이용 목적</h2>
            <p>
              GADA Inc.(이하 "회사")는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>회원가입 및 관리: 회원 가입 의사 확인, 서비스 부정이용 방지, 각종 고지·통지 목적</li>
              <li>서비스 제공: 구인구직 매칭, 팀 관리, 채팅 서비스, 계약 체결 등</li>
              <li>고충처리: 민원인 확인, 불만 접수 및 처리</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">2. 수집하는 개인정보 항목</h2>

            <h3 className="mb-2 font-semibold text-neutral-800">필수 항목</h3>
            <ul className="space-y-1 list-disc pl-5 mb-3">
              <li>이름 (실명)</li>
              <li>전화번호</li>
              <li>역할 (근로자, 팀장, 기업 담당자)</li>
            </ul>

            <h3 className="mb-2 font-semibold text-neutral-800">선택 항목 (프로필 등록 시)</h3>
            <ul className="space-y-1 list-disc pl-5 mb-3">
              <li>프로필 사진</li>
              <li>국적</li>
              <li>생년월일</li>
              <li>비자 종류 (E-9, H-2, F-4~F-6, E-7, 기타)</li>
              <li>희망 급여 및 급여 단위</li>
              <li>보유 언어 및 수준</li>
              <li>자격증 정보 (자격증명, 취득일, 만료일)</li>
              <li>보유 장비</li>
              <li>포트폴리오 (작업 경력, 사진)</li>
              <li>건강검진 상태</li>
              <li>소속 팀 정보</li>
            </ul>

            <h3 className="mb-2 font-semibold text-neutral-800">서비스 이용 과정에서 자동 생성·수집되는 정보</h3>
            <ul className="space-y-1 list-disc pl-5">
              <li>서비스 이용 기록, 접속 로그</li>
              <li>기기 정보 (모바일 앱 이용 시)</li>
              <li>위치 정보 (일자리 검색 시 반경 설정에 활용, 별도 동의 후 수집)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">3. 개인정보의 보유 및 이용기간</h2>
            <p className="mb-2">
              회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
            </p>
            <ul className="space-y-2 list-disc pl-5">
              <li>회원 탈퇴 시: 즉시 파기 (단, 관련 법령에 따라 일정 기간 보관이 필요한 정보는 해당 기간 보관)</li>
              <li>전자상거래 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
              <li>소비자의 불만 또는 분쟁처리 기록: 3년</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">4. 개인정보의 제3자 제공</h2>
            <p className="mb-2">
              회사는 정보주체의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다:
            </p>
            <ul className="space-y-2 list-disc pl-5">
              <li>정보주체가 사전에 동의한 경우 (예: 채용 제안 시 이름·전화번호 공개)</li>
              <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">5. 개인정보의 파기</h2>
            <p>
              회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다. 전자적 파일 형태의 정보는 기술적 방법을 사용하여 복구 불가능하게 삭제하며, 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">6. 정보주체의 권리·의무 및 행사 방법</h2>
            <p className="mb-2">이용자는 언제든지 다음의 권리를 행사할 수 있습니다:</p>
            <ul className="space-y-1 list-disc pl-5">
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리 정지 요구</li>
            </ul>
            <p className="mt-2">
              권리 행사는 서비스 내 '프로필 수정' 또는 고객센터를 통해 가능하며, 회사는 이에 대해 지체 없이 조치하겠습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">7. 개인정보 보호책임자</h2>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <p className="font-semibold text-neutral-900 mb-1">GADA Inc. 개인정보 보호책임자</p>
              <p>이메일: privacy@gada.team</p>
              <p>처리 기한: 10일 이내</p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">8. 쿠키(Cookie)의 사용</h2>
            <p>
              회사는 이용자에게 최적화된 서비스를 제공하기 위해 쿠키(cookie)를 사용합니다. 쿠키는 웹사이트가 이용자의 컴퓨터 브라우저에 전송하는 소량의 정보입니다. 이용자는 브라우저 설정을 통해 쿠키 사용을 거부할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-neutral-900">9. 개인정보처리방침의 변경</h2>
            <p>
              이 개인정보처리방침은 2025년 1월 1일부터 적용됩니다. 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 서비스 내 공지사항을 통하여 고지하겠습니다.
            </p>
          </section>
        </div>

        <div className="mt-10 border-t border-neutral-200 pt-6 text-center">
          <p className="text-xs text-neutral-400">© 2025 GADA Inc. All rights reserved.</p>
          <div className="mt-2 flex justify-center gap-4 text-xs text-neutral-400">
            <Link href="/terms" className="hover:text-neutral-600 underline">이용약관</Link>
            <Link href="/privacy" className="hover:text-neutral-600 underline">개인정보처리방침</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
