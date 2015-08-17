eventName = "ClearExpiredIncompleteCAPs"; // Please replace eventName value with the actual Event Name. Max length is VARCHAR(30).
batchJobName = "ClearExpiredIncompleteCAPs"; // Please replace batchJobName value with the actual Batch Job Name. Max length is VARCHAR(30).
batchJobDesc = "ClearExpiredIncompleteCAPs"; // Please replace batchJobDesc value with the actual Batch Job Description. Max length is VARCHAR(240).
batchJobResult = "ClearExpiredIncompleteCAPs"; // Please replace batchJobResult value with the actual Batch Job Result. Max length is VARCHAR(240).
sysDate = aa.date.getCurrentDate(); 
batchJobID = aa.batchJob.getJobID().getOutput(); 
var removeResult = aa.cap.removeExpiredIncompleteCAP();
if(removeResult.getSuccess())
{
  aa.print("passed");
  aa.env.setValue("ScriptReturnCode","0");
  aa.env.setValue("ScriptReturnMessage","Remove expired incomplete CAPS successful");
  aa.eventLog.createEventLog(eventName, "Batch Process", batchJobName, sysDate, sysDate,batchJobDesc, batchJobResult, batchJobID);
}
else
{
  aa.print("failed");
  aa.env.setValue("ScriptReturnCode","1");
  aa.env.setValue("ScriptReturnMessage","Remove expired incomplete CAPS failed");
}