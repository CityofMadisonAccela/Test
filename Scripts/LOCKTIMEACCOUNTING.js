 aa.print("lock/unlock time accounting start:");var timeLogSeq = 165;var timeLogModel = aa.timeAccounting.getTimeLogModel(timeLogSeq ).getOutput();if (timeLogModel != null){//set lock/unlock status: L/UtimeLogModel.setTimeLogStatus("L");var currentDate = aa.date.getCurrentDate();timeLogModel.setLastChangeDate(currentDate);var lockTimeAccountingResult = aa.timeAccounting.updateTimeLogModel(timeLogModel);if (lockTimeAccountingResult.getSuccess()){	aa.print("locked/unlocked time accounting successfully");}else{	aa.print("**ERROR: locked/unlocked time accounting : " + lockTimeAccountingResult.getErrorMessage()); }}aa.print("lock/unlock time accounting end:");