/**
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
      var waterMatch = rawWater.match(/(\d+)\s*잔/);
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

      var completionRate = item.completionRate;
      if (item.exercises && item.exercises.length > 0) {
        var completedExCount = 0;
        for (var exIdx = 0; exIdx < item.exercises.length; exIdx++) {
          if (item.exercises[exIdx].completed) completedExCount++;
        }
        completionRate = Math.round((completedExCount / item.exercises.length) * 100);
      }
      if (completionRate === undefined || isNaN(completionRate)) completionRate = 0;

      var rowData = [
        dateStr,
        item.dayOfWeek || "",
        item.workoutPart || "",
        completionRate + "%",
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
