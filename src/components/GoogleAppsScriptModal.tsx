import React, { useState } from 'react';
import {
  X,
  Code2,
  Copy,
  Check,
  ExternalLink,
  Save,
  Send,
  CloudCheck,
  AlertCircle,
  HelpCircle,
  Sparkles,
  RefreshCw,
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react';
import {
  GOOGLE_APPS_SCRIPT_CODE,
  saveGasWebAppUrl,
  syncToGoogleAppsScript,
  setGasAutoSyncEnabled,
  fetchLogsFromGoogleAppsScript,
} from '../lib/googleAppsScript';
import { WorkoutLogEntry } from '../types';

interface GoogleAppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  webAppUrl: string;
  onUpdateWebAppUrl: (url: string) => void;
  autoSync: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  currentEntry: WorkoutLogEntry;
  allLogs: Record<string, WorkoutLogEntry>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshFromSheet?: (url?: string) => Promise<void>;
  isFetching?: boolean;
  lastSyncedTime?: string | null;
}

export const GoogleAppsScriptModal: React.FC<GoogleAppsScriptModalProps> = ({
  isOpen,
  onClose,
  webAppUrl,
  onUpdateWebAppUrl,
  autoSync,
  onToggleAutoSync,
  currentEntry,
  allLogs,
  onShowToast,
  onRefreshFromSheet,
  isFetching = false,
  lastSyncedTime = null,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [inputUrl, setInputUrl] = useState(webAppUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isSyncingCurrent, setIsSyncingCurrent] = useState(false);
  const [activeTab, setActiveTab] = useState<'setup' | 'code' | 'guide'>('setup');

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setCopiedCode(true);
      onShowToast('구글 앱 스크립트 코드가 클립보드에 복사되었습니다!', 'success');
      setTimeout(() => setCopiedCode(false), 3000);
    } catch {
      onShowToast('코드 복사에 실패했습니다.', 'error');
    }
  };

  const handleSaveAndFetch = async () => {
    const trimmed = inputUrl.trim();
    if (trimmed && !trimmed.startsWith('https://script.google.com/')) {
      onShowToast('올바른 구글 앱 스크립트 웹 앱 URL 형태(https://script.google.com/...)가 아닙니다.', 'error');
      return;
    }
    saveGasWebAppUrl(trimmed);
    onUpdateWebAppUrl(trimmed);
    onShowToast('구글 앱 스크립트 웹 앱 URL이 저장되었습니다!', 'success');

    if (trimmed && onRefreshFromSheet) {
      await onRefreshFromSheet(trimmed);
    }
  };

  const handleTestConnection = async () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      onShowToast('먼저 웹 앱 URL을 입력해 주세요.', 'error');
      return;
    }
    setIsTesting(true);
    // Test 1: Fetch (doGet)
    const fetchRes = await fetchLogsFromGoogleAppsScript(trimmed);
    if (!fetchRes.success) {
      setIsTesting(false);
      onShowToast(`❌ 연결 실패: ${fetchRes.message}`, 'error');
      return;
    }

    // Test 2: Push (doPost)
    const pushRes = await syncToGoogleAppsScript(trimmed, currentEntry);
    setIsTesting(false);

    if (pushRes.success) {
      onShowToast(`🎉 양방향 연동 성공! 구글 시트에서 ${fetchRes.count || 0}건 조회 및 현재 기록 전송을 완료했습니다.`, 'success');
      if (onRefreshFromSheet) {
        onRefreshFromSheet(trimmed);
      }
    } else {
      onShowToast(`조회는 성공했으나 전송 실패: ${pushRes.message}`, 'error');
    }
  };

  const handleSyncCurrent = async () => {
    if (!webAppUrl) {
      onShowToast('먼저 웹 앱 URL을 저장해 주세요.', 'error');
      return;
    }
    setIsSyncingCurrent(true);
    const res = await syncToGoogleAppsScript(webAppUrl, currentEntry);
    setIsSyncingCurrent(false);
    if (res.success) {
      onShowToast(`${currentEntry.date} 운동 기록이 구글 시트에 즉시 반영되었습니다!`, 'success');
    } else {
      onShowToast(res.message, 'error');
    }
  };

  const handleSyncAll = async () => {
    if (!webAppUrl) {
      onShowToast('먼저 웹 앱 URL을 저장해 주세요.', 'error');
      return;
    }
    const entries: WorkoutLogEntry[] = Object.values(allLogs);
    if (entries.length === 0) {
      onShowToast('전송할 운동 기록이 없습니다.', 'info');
      return;
    }

    setIsSyncingAll(true);
    const res = await syncToGoogleAppsScript(webAppUrl, entries);
    setIsSyncingAll(false);
    if (res.success) {
      onShowToast(`총 ${entries.length}일치 전체 기록이 구글 스프레드시트에 일괄 저장되었습니다!`, 'success');
    } else {
      onShowToast(res.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-linear-to-r from-emerald-50 via-teal-50/50 to-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  구글 스프레드시트 실시간 연동 (Apps Script)
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  실시간 양방향
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                PC와 모바일 어디서든 동일한 구글 시트 데이터를 최우선으로 불러오고 자동 저장합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-bold text-slate-600 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('setup')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'setup'
                ? 'border-emerald-600 text-emerald-700 font-extrabold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            1. 연동 URL 및 실시간 동기화
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'border-emerald-600 text-emerald-700 font-extrabold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            2. 최신 구글 앱 스크립트 코드
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-700 font-extrabold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            3. 연동 가이드
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
          {activeTab === 'setup' && (
            <div className="space-y-5">
              {/* Web App URL Input Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    배포된 구글 앱 스크립트 웹 앱 URL (Web App URL)
                  </label>
                  {webAppUrl ? (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      연동 활성화됨
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      URL 미등록
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveAndFetch}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                    >
                      <Save className="w-3.5 h-3.5" />
                      저장 및 동기화
                    </button>
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 disabled:opacity-50"
                    >
                      {isTesting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      연결 테스트
                    </button>
                  </div>
                </div>

                {lastSyncedTime && (
                  <p className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    마지막 실시간 동기화 완료: {lastSyncedTime}
                  </p>
                )}

                {/* Auto Sync Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800">
                      [성과 시트에 기록하기] 시 구글 시트 자동 저장
                    </span>
                    <p className="text-[11px] text-slate-500">
                      기록을 저장할 때마다 실시간으로 구글 시트에 행이 추가/업데이트됩니다.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={(e) => {
                        onToggleAutoSync(e.target.checked);
                        setGasAutoSyncEnabled(e.target.checked);
                        onShowToast(
                          e.target.checked ? '자동 동기화가 활성화되었습니다.' : '자동 동기화가 꺼졌습니다.',
                          'info'
                        );
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Direct Fetch & Push Action Cards */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                    실시간 데이터 가져오기 & 내보내기
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    PC ↔ 모바일 상호 동기화
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Pull / Fetch from Google Sheet (doGet) */}
                  <button
                    type="button"
                    onClick={() => onRefreshFromSheet && onRefreshFromSheet(webAppUrl)}
                    disabled={isFetching || !webAppUrl}
                    className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-2xs"
                  >
                    <Download className={`w-4 h-4 text-emerald-700 ${isFetching ? 'animate-bounce' : ''}`} />
                    <span>
                      {isFetching ? '시트에서 불러오는 중...' : '📥 구글 시트 데이터 불러오기 (Fetch)'}
                    </span>
                  </button>

                  {/* Push Today */}
                  <button
                    type="button"
                    onClick={handleSyncCurrent}
                    disabled={isSyncingCurrent || !webAppUrl}
                    className="p-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-900 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isSyncingCurrent ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <Send className="w-4 h-4 text-blue-600" />
                    )}
                    <span>오늘({currentEntry.date}) 기록만 전송</span>
                  </button>

                  {/* Push All */}
                  <button
                    type="button"
                    onClick={handleSyncAll}
                    disabled={isSyncingAll || !webAppUrl}
                    className="p-3 sm:col-span-2 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-900 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isSyncingAll ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                    ) : (
                      <UploadCloud className="w-4 h-4 text-indigo-600" />
                    )}
                    <span>전체 로컬 기록을 구글 시트에 일괄 백업 ({Object.keys(allLogs).length}일치)</span>
                  </button>
                </div>
              </div>

              {/* Status info box */}
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/80 space-y-1.5">
                <h5 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  구글 시트 최우선 데이터 출처(Source of Truth) 안내
                </h5>
                <p className="text-xs text-emerald-900/90 leading-relaxed">
                  웹 앱이 실행되거나 PC/모바일에서 탭으로 돌아올 때마다 구글 스프레드시트의 최신 데이터를 자동으로 가져옵니다. 어디서 접속하든 동일한 운동 기록을 완벽하게 확인할 수 있습니다.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    구글 스프레드시트 Apps Script 소스코드 (doGet + doPost 지원)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    실시간 불러오기(Fetch)와 저장(Push), 중복방지 덮어쓰기 로직이 모두 포함되어 있습니다.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 ${
                    copiedCode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-900 text-white'
                  }`}
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? '복사 완료!' : '전체 코드 복사하기'}
                </button>
              </div>

              <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-[380px] leading-relaxed shadow-inner">
                <pre>{GOOGLE_APPS_SCRIPT_CODE}</pre>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200/80 space-y-2.5">
                <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-700" />
                  구글 스프레드시트 연동 5단계 설치 방법:
                </h4>
                <ol className="text-xs text-amber-900 space-y-2 list-decimal list-inside leading-relaxed font-medium">
                  <li>
                    사용할 <strong>구글 스프레드시트</strong>를 브라우저에서 열고 상단 메뉴 <strong>[확장 프로그램] → [Apps Script]</strong>를 클릭합니다.
                  </li>
                  <li>
                    상단 <strong>[2. 최신 구글 앱 스크립트 코드]</strong> 탭에서 코드를 복사한 뒤, Apps Script 편집기 내용 전체를 지우고 붙여넣고 저장(Ctrl+S)합니다.
                  </li>
                  <li>
                    우측 상단 <strong>[배포] → [새 배포]</strong>를 클릭합니다.
                  </li>
                  <li>
                    유형(톱니바퀴)에서 <strong>[웹 앱]</strong>을 선택하고, <strong>액세스 권한: [모든 사용자 (Anyone)]</strong>로 설정 후 [배포]를 누릅니다.
                  </li>
                  <li>
                    발급된 <strong>웹 앱 URL</strong>을 복사하여 위의 입력창에 넣고 <strong>[저장 및 동기화]</strong>를 누르면 실시간 연동이 시작됩니다!
                  </li>
                </ol>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
                <span className="font-bold text-slate-900 block">💡 팁 (PC와 모바일 공유):</span>
                <p>
                  배포된 웹 앱 URL은 한번 발급받으면 PC와 스마트폰 브라우저 모두에서 동일하게 사용할 수 있습니다. 스마트폰으로 앱에 접속하여 동일한 URL만 한번 입력해두시면 양쪽에서 실시간으로 데이터가 공유됩니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            11개 열: 날짜 | 요일 | 부위 | 달성율 | 허리 | 심박 | 칼로리 | 중량 | 물 | 단식 | 상세JSON
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
