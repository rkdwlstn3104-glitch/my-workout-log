import { WorkoutLogEntry } from '../types';
import { formatWaistConditionText, createInitialEntryForDate } from './storage';
import { defaultTemplates, DAY_NAMES } from '../data/defaultTemplates';

const GAS_URL_KEY = 'workout_gas_webapp_url';
const GAS_AUTO_SYNC_KEY = 'workout_gas_auto_sync';
const GAS_LAST_SYNCED_KEY = 'workout_gas_last_synced';

export function getGasWebAppUrl(): string {
  try {
    return localStorage.getItem(GAS_URL_KEY) || '';
  } catch {
    return '';
  }
}

export function saveGasWebAppUrl(url: string): void {
  try {
    localStorage.setItem(GAS_URL_KEY, url.trim());
  } catch (e) {
    console.error('Failed to save GAS Web App URL:', e);
  }
}

export function isGasAutoSyncEnabled(): boolean {
  try {
    const val = localStorage.getItem(GAS_AUTO_SYNC_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setGasAutoSyncEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(GAS_AUTO_SYNC_KEY, String(enabled));
  } catch (e) {
    console.error('Failed to save auto sync state:', e);
  }
}

export function getLastSyncedTime(): string | null {
  try {
    return localStorage.getItem(GAS_LAST_SYNCED_KEY);
  } catch {
    return null;
  }
}

export function setLastSyncedTime(timeStr: string): void {
  try {
    localStorage.setItem(GAS_LAST_SYNCED_KEY, timeStr);
  } catch (e) {
    console.error('Failed to save last synced time:', e);
  }
}

export function formatEntryForGas(entry: WorkoutLogEntry) {
  let rate = typeof entry.completionRate === 'number' ? entry.completionRate : 0;
  if (Array.isArray(entry.exercises) && entry.exercises.length > 0) {
    const completedCount = entry.exercises.filter((e) => e.completed).length;
    rate = Math.round((completedCount / entry.exercises.length) * 100);
  }

  return {
    date: entry.date,
    dayOfWeek: entry.dayOfWeek,
    dayIndex: entry.dayIndex !== undefined ? entry.dayIndex : new Date(entry.date + 'T00:00:00').getDay(),
    workoutPart: entry.workoutPart,
    completionRate: rate,
    waistCondition: entry.waistCondition,
    waistConditionText: formatWaistConditionText(entry.waistCondition),
    heartRate: entry.heartRate || '',
    calories: entry.calories || '',
    weightMemo: entry.weightMemo || '',
    waterCups: entry.waterCups || 0,
    fastingSuccess: Boolean(entry.fastingSuccess),
    exercises: entry.exercises || [],
    savedAt: entry.savedAt || new Date().toISOString(),
  };
}

/**
 * Fetch all workout logs directly from Google Sheets via Google Apps Script doGet()
 * Sets Google Sheets as the absolute primary source of truth across PC and mobile.
 */
export async function fetchLogsFromGoogleAppsScript(
  webAppUrl: string
): Promise<{ success: boolean; logs?: Record<string, WorkoutLogEntry>; count?: number; message: string }> {
  if (!webAppUrl || !webAppUrl.startsWith('https://script.google.com/')) {
    return {
      success: false,
      message: '유효한 Google Apps Script 웹 앱 URL이 설정되지 않았습니다.',
    };
  }

  try {
    // Append timestamp to bust any cache between PC and mobile browsers
    const separator = webAppUrl.includes('?') ? '&' : '?';
    const fetchUrl = `${webAppUrl}${separator}_t=${Date.now()}`;

    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        message: `구글 시트 서버 응답 코드: ${response.status}`,
      };
    }

    const rawText = await response.text();
    let result: any = null;

    try {
      result = JSON.parse(rawText);
    } catch {
      // If response is plain text (e.g. older version of Apps Script code returning "운동 기록부 구글 앱 스크립트 웹 앱이 정상 작동 중입니다.")
      if (rawText.includes('정상 작동') || rawText.includes('작동 중') || rawText.length < 200) {
        return {
          success: false,
          message: '구글 앱 스크립트 코드가 이전 버전입니다. 상단 [⚡ 구글 시트 연동]에서 최신 Code.gs를 복사하여 [새 배포]를 진행해 주세요.',
        };
      }
      return {
        success: false,
        message: '구글 시트에서 올바른 JSON 데이터를 받지 못했습니다. Code.gs를 최신 버전으로 배포했는지 확인해 주세요.',
      };
    }

    if (!result || result.status !== 'success' || !Array.isArray(result.data)) {
      const errMsg = result?.message || '구글 시트 응답에 운동 기록 데이터가 포함되어 있지 않습니다.';
      return {
        success: false,
        message: errMsg,
      };
    }

    const logsMap: Record<string, WorkoutLogEntry> = {};

    result.data.forEach((item: any) => {
      const dateStr = String(item.date || '').trim();
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;

      const dateObj = new Date(dateStr + 'T00:00:00');
      const dayIndex = !isNaN(dateObj.getTime()) ? dateObj.getDay() : 1;
      const dayName = item.dayOfWeek || DAY_NAMES[dayIndex] || '월';

      // Reconstruct exercises checklist
      let exercises = Array.isArray(item.exercises) && item.exercises.length > 0 ? item.exercises : null;
      if (!exercises) {
        // If exercises checklist wasn't in JSON column, hydrate from default template for this day
        const template = defaultTemplates[dayIndex] || defaultTemplates[1];
        const completionRate = typeof item.completionRate === 'number' ? item.completionRate : 0;
        const totalItems = template.items.length;
        const completedCount = Math.round((completionRate / 100) * totalItems);

        exercises = template.items.map((tItem, idx) => ({
          id: `${dateStr}-ex-${idx}`,
          name: tItem.name,
          desc: tItem.desc,
          tip: tItem.tip,
          weight: tItem.weight || '',
          completed: idx < completedCount,
        }));
      }

      let calculatedRate = typeof item.completionRate === 'number' ? item.completionRate : 0;
      if (exercises && exercises.length > 0) {
        const completedCount = exercises.filter((e: any) => e.completed).length;
        calculatedRate = Math.round((completedCount / exercises.length) * 100);
      }

      logsMap[dateStr] = {
        date: dateStr,
        dayOfWeek: dayName,
        dayIndex: dayIndex,
        workoutPart: item.workoutPart || defaultTemplates[dayIndex]?.workoutPart || '루틴',
        exercises: exercises,
        completionRate: calculatedRate,
        waistCondition: item.waistCondition || null,
        heartRate: item.heartRate || '',
        calories: item.calories || '',
        weightMemo: item.weightMemo || '',
        waterCups: typeof item.waterCups === 'number' ? item.waterCups : 0,
        fastingSuccess: Boolean(item.fastingSuccess),
        savedAt: item.savedAt || new Date().toISOString(),
      };
    });

    const nowStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSyncedTime(nowStr);

    return {
      success: true,
      logs: logsMap,
      count: Object.keys(logsMap).length,
      message: `구글 스프레드시트에서 ${Object.keys(logsMap).length}건의 데이터를 실시간으로 불러왔습니다.`,
    };
  } catch (error) {
    return {
      success: false,
      message: `구글 시트 데이터 불러오기 연결 오류: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Push workout log entry or multiple entries to Google Apps Script Web App
 */
export async function syncToGoogleAppsScript(
  webAppUrl: string,
  data: WorkoutLogEntry | WorkoutLogEntry[]
): Promise<{ success: boolean; message: string }> {
  if (!webAppUrl || !webAppUrl.startsWith('https://script.google.com/')) {
    return {
      success: false,
      message: '유효한 Google Apps Script 웹 앱 URL이 설정되지 않았습니다.',
    };
  }

  const payload = Array.isArray(data)
    ? data.map(formatEntryForGas)
    : [formatEntryForGas(data)];

  try {
    // Send as POST with plain text to avoid CORS preflight blocks with Apps Script
    await fetch(webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'save',
        entries: payload,
      }),
    });

    const nowStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSyncedTime(nowStr);

    return {
      success: true,
      message: `구글 스프레드시트에 ${payload.length}건이 성공적으로 전송(저장)되었습니다!`,
    };
  } catch (error) {
    console.error('Google Apps Script sync error:', error);
    return {
      success: false,
      message: `구글 시트 전송 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Delete a specific date record from Google Spreadsheet
 */
export async function deleteFromGoogleAppsScript(
  webAppUrl: string,
  dateStr: string
): Promise<{ success: boolean; message: string }> {
  if (!webAppUrl || !webAppUrl.startsWith('https://script.google.com/')) {
    return { success: false, message: 'URL이 유효하지 않습니다.' };
  }

  try {
    await fetch(webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'delete',
        date: dateStr,
      }),
    });

    return {
      success: true,
      message: `${dateStr} 기록이 구글 시트에서 삭제되었습니다.`,
    };
  } catch (err) {
    console.error('Delete from Google Apps Script failed:', err);
    return {
      success: false,
      message: `구글 시트 행 삭제 오류: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * The standard Google Apps Script Code supporting both doGet (Realtime Fetch) and doPost (Realtime Push)
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * [나만의 운동 기록부] 구글 스프레드시트 실시간 양방향 연동 스크립트 (Fetch & Push)
 * 
 * 📌 설치 및 배포 방법:
 * 1. 구글 스프레드시트를 열고 상단 메뉴 [확장 프로그램] -> [Apps Script] 클릭
 * 2. 기존 코드를 모두 지우고 이 스크립트 전체를 붙여넣기 후 저장 (Ctrl + S)
 * 3. 상단 [배포] -> [새 배포] 클릭
 * 4. 유형(톱니바퀴): [웹 앱] 선택
 * 5. 설정:
 *    - 설명: 운동기록 실시간 연동
 *    - 다음 사용자로 실행: [나] (본인 구글 계정)
 *    - 액세스 권한이 있는 사용자: [모든 사용자 (Anyone)] ⭐ 필수!
 * 6. [배포] 버튼 클릭 후 생성된 웹 앱 URL 복사하여 앱에 입력
 */

/**
 * 1. 데이터 불러오기 (GET): PC/모바일에서 구글 시트의 모든 기록을 실시간으로 읽어옵니다.
 */
function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    
    // 데이터가 없거나 헤더만 있는 경우
    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        data: [],
        count: 0,
        message: "시트에 저장된 운동 기록이 없습니다."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var lastCol = Math.max(sheet.getLastColumn(), 11);
    var range = sheet.getRange(2, 1, lastRow - 1, lastCol);
    var values = range.getValues();
    var results = [];

    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var rawDate = row[0];
      if (!rawDate) continue;

      var dateStr = "";
      if (rawDate instanceof Date) {
        dateStr = Utilities.formatDate(rawDate, Session.getScriptTimeZone() || "Asia/Seoul", "yyyy-MM-dd");
      } else {
        dateStr = String(rawDate).trim();
      }
      if (!dateStr) continue;

      // 11번째 열(K열)에 보관된 세부 JSON 파싱 (운동 체크리스트 항목 등)
      var rawJson = row[10];
      var parsedExtra = null;
      if (rawJson && typeof rawJson === "string" && rawJson.charAt(0) === "{") {
        try {
          parsedExtra = JSON.parse(rawJson);
        } catch (pe) {}
      }

      // 허리 상태 복원 (좋음/보통/주의)
      var waistStr = String(row[4] || "");
      var waistCondition = null;
      if (waistStr.indexOf("좋음") !== -1 || waistStr === "good") waistCondition = "good";
      else if (waistStr.indexOf("보통") !== -1 || waistStr === "normal") waistCondition = "normal";
      else if (waistStr.indexOf("주의") !== -1 || waistStr === "caution") waistCondition = "caution";

      // 달성율 숫자 파싱
      var rawRate = String(row[3] || "0").replace("%", "").trim();
      var completionRate = parseInt(rawRate, 10);
      if (isNaN(completionRate)) completionRate = 0;

      // 심박수 & 칼로리 파싱
      var rawHr = String(row[5] || "").replace(/[^0-9]/g, "").trim();
      var rawCal = String(row[6] || "").replace(/[^0-9]/g, "").trim();

      // 물 섭취 파싱
      var rawWater = String(row[8] || "");
      var waterMatch = rawWater.match(/(\\d+)\\s*잔/);
      var waterCups = waterMatch ? parseInt(waterMatch[1], 10) : (parseInt(rawWater.replace(/[^0-9]/g, ""), 10) || 0);

      // 단식 성공 여부 파싱
      var rawFast = String(row[9] || "");
      var fastingSuccess = rawFast.indexOf("O") !== -1 || rawFast.indexOf("성공") !== -1 || rawFast === "true";

      var entry = {
        date: dateStr,
        dayOfWeek: String(row[1] || ""),
        workoutPart: String(row[2] || ""),
        completionRate: completionRate,
        waistCondition: waistCondition,
        heartRate: rawHr || "",
        calories: rawCal || "",
        weightMemo: String(row[7] || ""),
        waterCups: waterCups,
        fastingSuccess: fastingSuccess,
        exercises: (parsedExtra && parsedExtra.exercises) ? parsedExtra.exercises : [],
        savedAt: (parsedExtra && parsedExtra.savedAt) ? parsedExtra.savedAt : new Date().toISOString()
      };

      results.push(entry);
    }

    // 날짜 기준 정렬 (최신순)
    results.sort(function(a, b) {
      return b.date.localeCompare(a.date);
    });

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: results,
      count: results.length,
      lastUpdated: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "데이터 조회 중 오류 발생: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 2. 데이터 저장 및 삭제 (POST): PC/모바일에서 구글 시트로 실시간 저장/수정/삭제합니다.
 */
function doPost(e) {
  try {
    var lock = LockService.getScriptLock();
    // 동시 쓰기 충돌 방지를 위해 10초 대기 락 획득
    lock.tryLock(10000);

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var requestData = JSON.parse(e.postData.contents);

    // 삭제 액션 처리
    if (requestData.action === "delete" && requestData.date) {
      var targetDate = String(requestData.date).trim();
      var numRows = sheet.getLastRow();
      if (numRows > 1) {
        var dateValues = sheet.getRange(2, 1, numRows - 1, 1).getValues();
        for (var r = dateValues.length - 1; r >= 0; r--) {
          var rowDate = dateValues[r][0];
          var curDateStr = rowDate instanceof Date ? Utilities.formatDate(rowDate, Session.getScriptTimeZone() || "Asia/Seoul", "yyyy-MM-dd") : String(rowDate).trim();
          if (curDateStr === targetDate) {
            sheet.deleteRow(r + 2);
          }
        }
      }
      lock.releaseLock();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "delete", date: targetDate }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 저장 액션 처리 (단일 또는 복수 항목)
    var entries = Array.isArray(requestData) ? requestData : (requestData.entries || [requestData]);

    // 1. 헤더가 없는 경우 11개 열 헤더 자동 생성 및 스타일링
    if (sheet.getLastRow() === 0) {
      var headers = [
        "날짜",
        "요일",
        "운동 부위",
        "달성율(%)",
        "허리상태",
        "심박수",
        "칼로리",
        "중량 및 컨디션 메모",
        "물 섭취",
        "단식성공",
        "앱데이터(JSON)"
      ];
      sheet.appendRow(headers);
      
      var headerRange = sheet.getRange("A1:K1");
      headerRange.setBackground("#059669");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // 2. 기존 행들의 날짜 목록 확인 (동일 날짜는 덮어쓰기하여 중복 방지)
    var numRows = sheet.getLastRow();
    var existingDates = [];
    if (numRows > 1) {
      var dateValues = sheet.getRange(2, 1, numRows - 1, 1).getValues();
      existingDates = dateValues.map(function(row) {
        if (row[0] instanceof Date) {
          return Utilities.formatDate(row[0], Session.getScriptTimeZone() || "Asia/Seoul", "yyyy-MM-dd");
        }
        return String(row[0]).trim();
      });
    }

    // 3. 각 운동 기록 행 삽입/업데이트
    entries.forEach(function(item) {
      var dateStr = String(item.date || "").trim();
      if (!dateStr) return;

      var extraJson = JSON.stringify({
        exercises: item.exercises || [],
        savedAt: item.savedAt || new Date().toISOString()
      });

      var rowData = [
        dateStr,
        item.dayOfWeek || "",
        item.workoutPart || "",
        (item.completionRate !== undefined ? item.completionRate + "%" : "0%"),
        item.waistConditionText || item.waistCondition || "보통",
        item.heartRate ? item.heartRate + " bpm" : "-",
        item.calories ? item.calories + " kcal" : "-",
        item.weightMemo || "-",
        (item.waterCups || 0) + "잔 (" + ((item.waterCups || 0) * 500) + "ml)",
        item.fastingSuccess ? "⭕ O (성공)" : "❌ X (미완)",
        extraJson
      ];

      var foundIndex = existingDates.indexOf(dateStr);
      if (foundIndex !== -1) {
        // 기존 날짜 행 업데이트
        var targetRow = foundIndex + 2;
        sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
      } else {
        // 새로운 날짜 행 추가
        sheet.appendRow(rowData);
        existingDates.push(dateStr);
      }
    });

    // 텍스트 정렬 적용 (A~G, I, J열 가운데 정렬)
    var updatedLastRow = sheet.getLastRow();
    if (updatedLastRow > 1) {
      sheet.getRange(2, 1, updatedLastRow - 1, 7).setHorizontalAlignment("center");
      sheet.getRange(2, 9, updatedLastRow - 1, 2).setHorizontalAlignment("center");
    }

    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: entries.length, message: "구글 시트 동기화 완료" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;

