import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Search,
  Filter,
  Sparkles,
  ExternalLink,
  Trash2,
  Calendar,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { WorkoutLogEntry } from '../types';
import { generateGoogleSheetsTSV, generateCSV, formatWaistConditionText } from '../lib/storage';

interface GoogleSheetViewProps {
  logs: Record<string, WorkoutLogEntry>;
  selectedDateStr: string;
  onSelectDate: (dateStr: string) => void;
  onDeleteRow: (dateStr: string) => void;
  webAppUrl?: string;
  autoSync?: boolean;
  onOpenGasModal?: () => void;
  onRefreshFromSheet?: (url?: string) => Promise<void>;
  isFetching?: boolean;
  lastSyncedTime?: string | null;
}

export const GoogleSheetView: React.FC<GoogleSheetViewProps> = ({
  logs,
  selectedDateStr,
  onSelectDate,
  onDeleteRow,
  webAppUrl = '',
  autoSync = true,
  onOpenGasModal,
  onRefreshFromSheet,
  isFetching = false,
  lastSyncedTime = null,
}) => {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWaistFilter, setSelectedWaistFilter] = useState<string>('all');

  // Convert logs record into sorted array (newest to oldest or chronological)
  const entriesList: WorkoutLogEntry[] = (Object.values(logs) as WorkoutLogEntry[]).sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  // Filter entries
  const filteredEntries = entriesList.filter((entry) => {
    const matchesSearch =
      entry.date.includes(searchQuery) ||
      entry.workoutPart.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.weightMemo && entry.weightMemo.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesWaist =
      selectedWaistFilter === 'all' || entry.waistCondition === selectedWaistFilter;

    return matchesSearch && matchesWaist;
  });

  const handleCopyTSV = async () => {
    const tsv = generateGoogleSheetsTSV(filteredEntries);
    try {
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  const handleDownloadCSV = () => {
    const csvContent = generateCSV(filteredEntries);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `나만의_운동_기록부_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="google-sheets-container" className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
      {/* Top Google Sheets Style Header */}
      <div className="bg-white border-b border-slate-200 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  나만의 운동 기록부
                </h2>
                <span className="text-amber-400 text-sm cursor-pointer" title="즐겨찾기">★</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  스프레드시트 뷰
                </span>
              </div>
              {/* Google Sheets Simulated Menu Bar */}
              <div className="hidden md:flex items-center gap-3 text-xs text-slate-600 mt-1 font-normal select-none">
                <span className="hover:text-slate-900 cursor-pointer">파일</span>
                <span className="hover:text-slate-900 cursor-pointer">수정</span>
                <span className="hover:text-slate-900 cursor-pointer">보기</span>
                <span className="hover:text-slate-900 cursor-pointer">삽입</span>
                <span className="hover:text-slate-900 cursor-pointer">서식</span>
                <span className="hover:text-slate-900 cursor-pointer">데이터</span>
                <span className="hover:text-slate-900 cursor-pointer">도구</span>
                <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                  <Sparkles className="w-3 h-3" /> Gemini
                </span>
                <span className="hover:text-slate-900 cursor-pointer">도움말</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Google Apps Script Auto-Sync, Refresh, Copy for Google Sheets & Export CSV */}
          <div className="flex flex-wrap items-center gap-2">
            {webAppUrl && onRefreshFromSheet && (
              <button
                type="button"
                id="btn-refresh-sheet"
                onClick={() => onRefreshFromSheet(webAppUrl)}
                disabled={isFetching}
                className="px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs border bg-blue-50 text-blue-800 hover:bg-blue-100 border-blue-300 disabled:opacity-50"
                title="구글 스프레드시트에서 최신 데이터 즉시 새로고침"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
                <span>{isFetching ? '동기화 중...' : '시트 실시간 불러오기'}</span>
              </button>
            )}

            {onOpenGasModal && (
              <button
                type="button"
                id="btn-open-gas-modal"
                onClick={onOpenGasModal}
                className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs border ${
                  webAppUrl
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-300'
                }`}
                title="구글 앱 스크립트를 통한 실시간 자동 동기화 설정"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {webAppUrl
                    ? autoSync
                      ? '⚡ 시트 연동 설정'
                      : '구글 시트 연동됨 (수동)'
                    : '⚡ 구글 시트 연동'}
                </span>
              </button>
            )}

            <button
              id="btn-copy-sheets"
              onClick={handleCopyTSV}
              className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
              }`}
              title="실제 구글 스프레드시트에 바로 붙여넣기(Ctrl+V) 가능한 형식으로 복사"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '복사완료! (Ctrl+V)' : '시트 복사 (Ctrl+V)'}</span>
            </button>

            <button
              id="btn-export-csv"
              onClick={handleDownloadCSV}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV 다운로드</span>
            </button>
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="날짜, 운동부위, 중량 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
              <Filter className="w-3 h-3 text-slate-400 ml-1" />
              <span className="text-slate-500 text-[11px]">허리:</span>
              <select
                value={selectedWaistFilter}
                onChange={(e) => setSelectedWaistFilter(e.target.value)}
                aria-label="허리 상태 필터"
                className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none pr-1"
              >
                <option value="all">전체 상태</option>
                <option value="good">🟢 좋음</option>
                <option value="normal">🟡 보통</option>
                <option value="caution">🔴 주의</option>
              </select>
            </div>

            <span className="text-slate-500 text-xs">
              총 <strong className="text-slate-800">{filteredEntries.length}</strong>건 기록
            </span>
          </div>
        </div>
      </div>

      {/* Spreadsheet Grid View (A1 to J1 Matching the exact Sheet Columns) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          {/* Column Letters Row (Google Sheets Style: A, B, C, D, E, F, G, H, I, J) */}
          <thead>
            <tr className="bg-slate-100/90 text-slate-500 text-[11px] select-none">
              <th className="w-8 py-1 px-2 border-r border-b border-slate-300 text-center font-normal">#</th>
              <th className="py-1 px-3 border-r border-b border-slate-300 text-center font-normal">A</th>
              <th className="py-1 px-2 border-r border-b border-slate-300 text-center font-normal">B</th>
              <th className="py-1 px-4 border-r border-b border-slate-300 text-center font-normal">C</th>
              <th className="py-1 px-3 border-r border-b border-slate-300 text-center font-normal">D</th>
              <th className="py-1 px-3 border-r border-b border-slate-300 text-center font-normal">E</th>
              <th className="py-1 px-3 border-r border-b border-slate-300 text-center font-normal">F</th>
              <th className="py-1 px-3 border-r border-b border-slate-300 text-center font-normal">G</th>
              <th className="py-1 px-4 border-r border-b border-slate-300 text-center font-normal">H</th>
              <th className="py-1 px-3 border-r border-b border-slate-300 text-center font-normal">I</th>
              <th className="py-1 px-3 border-r border-b border-slate-300 text-center font-normal">J</th>
              <th className="py-1 px-2 border-b border-slate-300 text-center font-normal">관리</th>
            </tr>
            {/* Header Column Names (날짜, 요일, 운동 부위, 달성율(%), 허리상태, 심박수, 칼로리, 중량메모, 물(컵), 단식성공) */}
            <tr className="bg-blue-50/70 text-slate-800 font-bold border-b border-slate-300 select-none">
              <th className="py-2.5 px-2 border-r border-slate-200 text-center text-slate-400 bg-slate-100/50">1</th>
              <th className="py-2.5 px-3 border-r border-slate-200">날짜</th>
              <th className="py-2.5 px-2 border-r border-slate-200 text-center">요일</th>
              <th className="py-2.5 px-4 border-r border-slate-200">운동 부위</th>
              <th className="py-2.5 px-3 border-r border-slate-200 text-center">달성율(%)</th>
              <th className="py-2.5 px-3 border-r border-slate-200 text-center">허리상태</th>
              <th className="py-2.5 px-3 border-r border-slate-200 text-center">심박수</th>
              <th className="py-2.5 px-3 border-r border-slate-200 text-center">칼로리</th>
              <th className="py-2.5 px-4 border-r border-slate-200">중량메모</th>
              <th className="py-2.5 px-3 border-r border-slate-200 text-center">물(컵)</th>
              <th className="py-2.5 px-3 border-r border-slate-200 text-center">단식성공</th>
              <th className="py-2.5 px-2 text-center text-slate-500">동작</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white font-medium">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-10 text-center text-slate-400 text-xs">
                  기록된 운동 일기가 없습니다. 달력에서 날짜를 선택하고 기록을 저장해보세요!
                </td>
              </tr>
            ) : (
              filteredEntries.map((row, index) => {
                const isSelected = row.date === selectedDateStr;
                return (
                  <tr
                    key={row.date}
                    className={`hover:bg-blue-50/40 transition-colors group cursor-pointer ${
                      isSelected ? 'bg-blue-50/80 font-semibold' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                    onClick={() => onSelectDate(row.date)}
                  >
                    {/* Row Number */}
                    <td className="py-2 px-2 border-r border-slate-200 text-center text-[10px] text-slate-400 bg-slate-100/40 select-none">
                      {index + 2}
                    </td>
                    {/* A: 날짜 */}
                    <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap text-slate-900 font-mono">
                      {row.date}
                    </td>
                    {/* B: 요일 */}
                    <td className="py-2 px-2 border-r border-slate-200 text-center whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                          row.dayOfWeek === '일'
                            ? 'text-rose-600 bg-rose-50'
                            : row.dayOfWeek === '토'
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-slate-700 bg-slate-100'
                        }`}
                      >
                        {row.dayOfWeek}
                      </span>
                    </td>
                    {/* C: 운동 부위 */}
                    <td className="py-2 px-4 border-r border-slate-200 whitespace-nowrap text-slate-800">
                      {row.workoutPart || '-'}
                    </td>
                    {/* D: 달성율(%) */}
                    <td className="py-2 px-3 border-r border-slate-200 text-center whitespace-nowrap">
                      {(() => {
                        const calculatedRate =
                          Array.isArray(row.exercises) && row.exercises.length > 0
                            ? Math.round((row.exercises.filter((e) => e.completed).length / row.exercises.length) * 100)
                            : typeof row.completionRate === 'number'
                            ? row.completionRate
                            : 0;

                        return (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              calculatedRate === 100
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : calculatedRate >= 50
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : calculatedRate > 0
                                ? 'bg-orange-100 text-orange-900 border border-orange-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {calculatedRate}%
                          </span>
                        );
                      })()}
                    </td>
                    {/* E: 허리상태 */}
                    <td className="py-2 px-3 border-r border-slate-200 text-center whitespace-nowrap">
                      {row.waistCondition === 'good' && (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">🟢 좋음</span>
                      )}
                      {row.waistCondition === 'normal' && (
                        <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md">🟡 보통</span>
                      )}
                      {row.waistCondition === 'caution' && (
                        <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md">🔴 주의</span>
                      )}
                      {!row.waistCondition && <span className="text-slate-400">-</span>}
                    </td>
                    {/* F: 심박수 */}
                    <td className="py-2 px-3 border-r border-slate-200 text-center whitespace-nowrap text-rose-600 font-mono">
                      {row.heartRate ? `${row.heartRate} bpm` : '-'}
                    </td>
                    {/* G: 칼로리 */}
                    <td className="py-2 px-3 border-r border-slate-200 text-center whitespace-nowrap text-amber-700 font-mono">
                      {row.calories ? `${row.calories} kcal` : '-'}
                    </td>
                    {/* H: 중량메모 */}
                    <td className="py-2 px-4 border-r border-slate-200 text-slate-700 max-w-xs truncate" title={row.weightMemo}>
                      {row.weightMemo || '-'}
                    </td>
                    {/* I: 물(컵) */}
                    <td className="py-2 px-3 border-r border-slate-200 text-center whitespace-nowrap text-cyan-700">
                      {row.waterCups > 0 ? `${row.waterCups}잔 (${row.waterCups * 500}ml)` : '0잔'}
                    </td>
                    {/* J: 단식성공 */}
                    <td className="py-2 px-3 border-r border-slate-200 text-center whitespace-nowrap">
                      {row.fastingSuccess ? (
                        <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">⭕ O</span>
                      ) : (
                        <span className="text-slate-400 font-normal">❌ X</span>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="py-2 px-2 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onDeleteRow(row.date)}
                        title="기록 삭제"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        aria-label="기록 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
