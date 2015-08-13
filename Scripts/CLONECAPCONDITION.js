 var error = "";var message = "";var br = "<br>";main();if (error && error.length > 0){         aa.env.setValue("ScriptReturnCode", "1");         aa.env.setValue("ScriptReturnMessage", error);}else{         aa.env.setValue("ScriptReturnCode", "0");         aa.env.setValue("ScriptReturnMessage", message);}function main(){         var sourceCapID = getSourceCapId();         var targetCapID = getTargetCapId();         if (sourceCapID == null || targetCapID == null)         {                   logError("sourceCapID or targetCapID shouldn't be null.");                   return;         }                  var result = aa.capCondition.cloneCapCondition(sourceCapID, targetCapID);         if (result.getSuccess())         {                   logMessage("Done");         }         else         {                   logError("Faild");         }}function getSourceCapId(){         var s_id1 = "08HUI";         var s_id2 = "00000";         var s_id3 = "00498";         var s_capResult = aa.cap.getCapID(s_id1, s_id2, s_id3);         if(s_capResult.getSuccess())         {                   return s_capResult.getOutput();         }         else         {                   logError("ERROR: Failed to get capId: " + s_capResult.getErrorMessage());                   return null;         }}function getTargetCapId(){         var s_id1 = "08HUI";         var s_id2 = "00000";         var s_id3 = "00499";         var s_capResult = aa.cap.getCapID(s_id1, s_id2, s_id3);         if(s_capResult.getSuccess())         {                   return s_capResult.getOutput();         }         else         {                   logError("ERROR: Failed to get capId: " + s_capResult.getErrorMessage());                   return null;         }}function logError(str){         error += str + br;}function logMessage(str){         message += str + br;}