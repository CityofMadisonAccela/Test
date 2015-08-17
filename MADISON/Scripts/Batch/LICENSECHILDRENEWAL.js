/* This is may attempt at the licensing script */

/* Setting email default user as me! */
aa.env.setValue("emailAddress","RSjachrani@cityofmadison.com");

/* This looks like starting variables */
var showMessage = false;			// Set to true to see results in popup window
var showDebug = true;				// Set to true to see debug messages in popup window
var maxSeconds = 295;				// number of seconds allowed for batch processing, usually < 5*60
var emailText = "";
var useAppSpecificGroupName = false;					// Use Group name when populating App Specific Info Values

/* This is Batch variables that shouldn't be messed with */
var systemUserObj = aa.person.getUser("ADMIN").getOutput();  // Current User Object
var emailAddress = "" + aa.env.getValue("emailAddress");	// email to send report
var ccAddress = "" + aa.env.getValue("ccAddress");	// email to send report
var batchJobName = "" + aa.env.getValue("BatchJobName");	// Name of the batch job

/* This is the beginning initialization of the batch script */
var message = "";
var startDate = new Date();
var startTime = startDate.getTime();			// Start timer
var sysDate = aa.date.getCurrentDate();
var sysDateMMDDYYYY = dateFormatted(sysDate.getMonth(),sysDate.getDayOfMonth(),sysDate.getYear(),"MM/DD/YYYY");
var setID = "";
var timeExpired = false;
var batchJobID = aa.batchJob.getJobID().getOutput();
var br = "<BR>";	
var currentUserID = aa.env.getValue("CurrentUserID");   		// Current User			

/* This is the start of the Main Loop */
// we are going to hard code to this for testing Licenses/Clerk/ClassBBeerLiquor/NA
aa.cap.getByAppType("Licenses","Clerk","ClassBBeerLiquor","NA");

//part of the debugging
logMessage("START","Start of Job<br>");
logMessage("PARAMETER emailAddress = " + emailAddress + "<br>");
logMessage("PARAMETER batchJobName = " + batchJobName + "<br>");

/* This is the end of the main process */
if (emailAddress.length) //let's send the email results
{
	emailText = "below are the results <br>" + emailText;
	if (!ccAddress.length) ccAddress = "";
	aa.sendMail("noreply@cityofmadison.com", emailAddress, ccAddress, batchJobName + " Results", emailText);
}

/* Here are some Functions */
function createChild(grp,typ,stype,cat,desc) 
//
// creates the new application and returns the capID object
//
	{
	var appCreateResult = aa.cap.createApp(grp,typ,stype,cat,desc);
	//logDebug("creating cap " + grp + "/" + typ + "/" + stype + "/" + cat);
	if (appCreateResult.getSuccess())
		{
		var newId = appCreateResult.getOutput();
		//logDebug("cap " + grp + "/" + typ + "/" + stype + "/" + cat + " created successfully ");
		
		// create Detail Record
		capModel = aa.cap.newCapScriptModel().getOutput();
		capDetailModel = capModel.getCapModel().getCapDetailModel();
		capDetailModel.setCapID(newId);
		aa.cap.createCapDetail(capDetailModel);

		var newObj = aa.cap.getCap(newId).getOutput();	//Cap object
		var result = aa.cap.createAppHierarchy(capId, newId); 
		if (!result.getSuccess())
			logDebug("Could not link applications");

		// Copy Parcels
		var capParcelResult = aa.parcel.getParcelandAttribute(capId,null);
		if (capParcelResult.getSuccess())
			{
			var Parcels = capParcelResult.getOutput().toArray();
			for (zz in Parcels)
				{
				//logDebug("adding parcel #" + zz + " = " + Parcels[zz].getParcelNumber());
				var newCapParcel = aa.parcel.getCapParcelModel().getOutput();
				newCapParcel.setParcelModel(Parcels[zz]);
				newCapParcel.setCapIDModel(newId);
				newCapParcel.setL1ParcelNo(Parcels[zz].getParcelNumber());
				newCapParcel.setParcelNo(Parcels[zz].getParcelNumber());
				aa.parcel.createCapParcel(newCapParcel);
				}
			}

		// Copy Contacts
		capContactResult = aa.people.getCapContactByCapID(capId);
		if (capContactResult.getSuccess())
			{
			Contacts = capContactResult.getOutput();
			for (yy in Contacts)
				{
				var newContact = Contacts[yy].getCapContactModel();
				newContact.setCapID(newId);
				aa.people.createCapContact(newContact);
				//logDebug("added contact");
				}
			}	

		// Copy Addresses
		capAddressResult = aa.address.getAddressByCapId(capId);
		if (capAddressResult.getSuccess())
			{
			Address = capAddressResult.getOutput();
			for (yy in Address)
				{
				newAddress = Address[yy];
				newAddress.setCapID(newId);
				aa.address.createAddress(newAddress);
				//logDebug("added address");
				}
			}

		// Copy Owners
		capOwnerResult = aa.owner.getOwnerByCapId(capId);
		if (capOwnerResult.getSuccess())
			{
			Owner = capOwnerResult.getOutput();
			for (yy in Owner)
				{
				newOwner = Owner[yy];
				newOwner.setCapID(newId);
				aa.owner.createCapOwnerWithAPOAttribute(newOwner);
				//logDebug("added owner");
				}
			}
			
		return newId;
		}
	else
		{
		logDebug( "**ERROR: adding child App: " + appCreateResult.getErrorMessage());
		}
	}