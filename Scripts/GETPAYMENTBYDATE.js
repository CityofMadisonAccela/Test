 var message = "";var br = "<br>";var firstDate = aa.util.dateDiff(aa.util.now(), "day", -1);var endDate =   aa.util.dateDiff(aa.util.now(), "day", 1);firstDate.setHours(0);firstDate.setMinutes(0);firstDate.setSeconds(0);endDate.setHours(23);endDate.setMinutes(59);endDate.setSeconds(59);logMessage("Start to find payments from " + firstDate + " to " + endDate);var paymentResult = aa.finance.getPaymentByDate(firstDate, endDate, null);if (paymentResult.getSuccess()){	logMessage("Find payments from " + firstDate + " to " + endDate + " success.");	var paymentArray = paymentResult.getOutput();	for (var i = 0; i < paymentArray.length; i++)	{		var payment = paymentArray[i];		logMessage(i + ": " + payment.paymentSeqNbr);	}}else{	logMessage("Find payments from " + firstDate + " to " + endDate + " faild.");}aa.print(message);function logMessage(dstr){	message += dstr + br;}