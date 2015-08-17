var br = "<BR>";
var message = "";
var SetMemberArray= aa.env.getValue("SetMemberArray");
var useAppSpecificGroupName = true;					// Use Group name when populating App Specific Info Values

for(var i=0; i < SetMemberArray.length; i++) 
{
	var id = SetMemberArray[i];
	var capId = aa.cap.getCapID(id.getID1(), id.getID2(),id.getID3()).getOutput();
	var altId = capId.getCustomID();
	var cap = aa.cap.getCap(capId).getOutput();	
	var appTypeResult = cap.getCapType();
	var appTypeString = appTypeResult.toString();
	
	if (!validateGisObjects()) copyParcelGisObjects();

	if (appTypeString.indexOf("Construction") > -1)
		var rsGISLayer = "Bldg Inspect Dist";
	if (appTypeString.indexOf("HVAC") > -1)
		var rsGISLayer = "Heat Inspect Dist";
	if (appTypeString.indexOf("Electrical") > -1)
		var rsGISLayer = "Elec Inspect Dist";
	if (appTypeString.indexOf("Plumbing") > -1)
		var rsGISLayer = "Plumb Inspect Dist";
	if (appTypeString.indexOf("Property Maintenance") > -1)
		var rsGISLayer = "Property Maint Dist";
	if (appTypeString.indexOf("Health") > -1)
		var rsGISLayer = "Health San Dist";

	
	if (validateGisObjects())
	{
		if (appTypeString.indexOf("Health") > -1)
		{
			var varInsp = getGISInfo("agis_madison",rsGISLayer,"SanUserID");
			if(varInsp != undefined) 
				{
				assignCap(varInsp.toUpperCase());
				editAppSpecific("OFFICE USE ONLY.Sanitarian ID",getGISInfo("agis_madison",rsGISLayer,"SanID"));
				editAppSpecific("OFFICE USE ONLY.Sanitarian Name",getGISInfo("agis_madison",rsGISLayer,"SanName"));
				editAppSpecific("OFFICE USE ONLY.EH District ID",getGISInfo("agis_madison",rsGISLayer,"DistID"));
				}
			else
				{logMessage("ERROR " + altId);}
		}
		else
		{
			var varInsp = getGISInfo("agis_madison",rsGISLayer,"ACES_User_ID");
			if(varInsp != undefined) 
				{
				assignCap(varInsp.toUpperCase());
				}
			else
				{
				logMessage("ERROR " + altId);}
		}
	}
}

var sendResult = aa.sendMail("noreply@cityofmadison.com", "rsjachrani@cityofmadison.com", "", "SET Name:", "Message:" + message);
aa.env.setValue("ScriptReturnCode", "0");
aa.env.setValue("ScriptReturnMessage", "Message:" + message);

function logMessage(dstr)
	{
	message+=dstr + br;
	}
	
function logDebug(dstr)
	{
	message+=dstr + br;
	}

function validateGisObjects()
	{
	// returns true if the app has GIS objects that validate in GIS
	//
	var gisObjResult = aa.gis.getCapGISObjects(capId); // get gis objects on the cap
	if (gisObjResult.getSuccess()) 	
		var fGisObj = gisObjResult.getOutput();
	else
		{ logDebug("**ERROR: Getting GIS objects for Cap.  Reason is: " + gisObjResult.getErrorType() + ":" + gisObjResult.getErrorMessage()) ; return false }

	for (a1 in fGisObj) // for each GIS object on the Cap
		{
		var gischk = aa.gis.getGISObjectAttributes(fGisObj[a1]);

		if (gischk.getSuccess())
			var gisres = gischk.getOutput();
		else
			{ logDebug("**ERROR: Retrieving GIS Attributes.  Reason is: " + gischk.getErrorType() + ":" + gischk.getErrorMessage()) ; return false }	
		
		if (gisres != null)
			return true;  // we have a gis object from GIS
		}
	}
	
function copyParcelGisObjects() 
	{
	var capParcelResult = aa.parcel.getParcelandAttribute(capId,null);
	if (capParcelResult.getSuccess())
		{
		var Parcels = capParcelResult.getOutput().toArray();
		for (zz in Parcels)
			{
			var ParcelValidatedNumber = Parcels[zz].getParcelNumber();
			logDebug("Looking at parcel " + ParcelValidatedNumber);
			var gisObjResult = aa.gis.getParcelGISObjects(ParcelValidatedNumber); // get gis objects on the parcel number
			if (gisObjResult.getSuccess()) 	
				var fGisObj = gisObjResult.getOutput();
			else
				{ logDebug("**ERROR: Getting GIS objects for Parcel.  Reason is: " + gisObjResult.getErrorType() + ":" + gisObjResult.getErrorMessage()) ; return false }

			for (a1 in fGisObj) // for each GIS object on the Cap
				{
				var gisTypeScriptModel = fGisObj[a1];
                                var gisObjArray = gisTypeScriptModel.getGISObjects()
                                for (b1 in gisObjArray)
                                	{
  					var gisObjScriptModel = gisObjArray[b1];
  					var gisObjModel = gisObjScriptModel.getGisObjectModel() ;

					var retval = aa.gis.addCapGISObject(capId,gisObjModel.getServiceID(),gisObjModel.getLayerId(),gisObjModel.getGisId());

					if (retval.getSuccess())
						{ logDebug("Successfully added Cap GIS object: " + gisObjModel.getGisId())}
					else
						{ logDebug("**ERROR: Could not add Cap GIS Object.  Reason is: " + retval.getErrorType() + ":" + retval.getErrorMessage()) ; return false }	
					}
				}
			}
		}	
	else
		{ logDebug("**ERROR: Getting Parcels from Cap.  Reason is: " + capParcelResult.getErrorType() + ":" + capParcelResult.getErrorMessage()) ; return false }
	}
	
function assignCap(assignId) // option CapId
	{
	var itemCap = capId
	if (arguments.length > 1) itemCap = arguments[1]; // use cap ID specified in args

	var cdScriptObjResult = aa.cap.getCapDetail(itemCap);
	if (!cdScriptObjResult.getSuccess())
		{ logMessage("**ERROR: No cap detail script object : " + cdScriptObjResult.getErrorMessage()) ; return false; }
	
	var cdScriptObj = cdScriptObjResult.getOutput();

	if (!cdScriptObj)
		{ logMessage("**ERROR: No cap detail script object") ; return false; }
		
	cd = cdScriptObj.getCapDetailModel();
	
	iNameResult  = aa.person.getUser(assignId);

	if (!iNameResult.getSuccess())
		{ logMessage("**ERROR retrieving  user model " + assignId + " : " + iNameResult.getErrorMessage()) ; return false ; }
	
	iName = iNameResult.getOutput();

	cd.setAsgnDept(iName.getDeptOfUser());
	cd.setAsgnStaff(assignId);
		
	cdWrite = aa.cap.editCapDetail(cd)
	
	if (cdWrite.getSuccess())
		{ logDebug(altId + " Assigned CAP to " + assignId) }
	else
		{ logDebug("**ERROR writing capdetail : " + cdWrite.getErrorMessage()) ; return false ; }
	} 
	
function getGISInfo(svc,layer,attributename)
	{
	// use buffer info to get info on the current object by using distance 0
	// usage: 
	//
	// x = getGISInfo("flagstaff","Parcels","LOT_AREA");
	//
	
	var distanceType = "feet";
	var retString;
   	
	var bufferTargetResult = aa.gis.getGISType(svc,layer); // get the buffer target
	if (bufferTargetResult.getSuccess())
		{
		var buf = bufferTargetResult.getOutput();
		buf.addAttributeName(attributename);
		}
	else
		{ logDebug("**ERROR: Getting GIS Type for Buffer Target.  Reason is: " + bufferTargetResult.getErrorType() + ":" + bufferTargetResult.getErrorMessage()) ; return false }
			
	var gisObjResult = aa.gis.getCapGISObjects(capId); // get gis objects on the cap
	if (gisObjResult.getSuccess()) 	
		var fGisObj = gisObjResult.getOutput();
	else
		{ logDebug("**ERROR: Getting GIS objects for Cap.  Reason is: " + gisObjResult.getErrorType() + ":" + gisObjResult.getErrorMessage()) ; return false }

	for (a1 in fGisObj) // for each GIS object on the Cap.  We'll only send the last value
		{
		var bufchk = aa.gis.getBufferByRadius(fGisObj[a1], "0", distanceType, buf);

		if (bufchk.getSuccess())
			var proxArr = bufchk.getOutput();
		else
			{ logDebug("**ERROR: Retrieving Buffer Check Results.  Reason is: " + bufchk.getErrorType() + ":" + bufchk.getErrorMessage()) ; return false }	
		
		for (a2 in proxArr)
			{
			var proxObj = proxArr[a2].getGISObjects();  // if there are GIS Objects here, we're done
			for (z1 in proxObj)
				{
				var v = proxObj[z1].getAttributeValues()
				retString = v[0];
				}
			
			}
		}
	return retString
	}
	
function editAppSpecific(itemName,itemValue)  // optional: itemCap
	{
	var updated = false;
	var i=0;
	itemCap = capId;
	if (arguments.length == 3) itemCap = arguments[2]; // use cap ID specified in args
   	
  	if (useAppSpecificGroupName)
		{
		if (itemName.indexOf(".") < 0)
			{ logDebug("**WARNING: editAppSpecific requires group name prefix when useAppSpecificGroupName is true") ; return false }
		
		
		var itemGroup = itemName.substr(0,itemName.indexOf("."));
		var itemName = itemName.substr(itemName.indexOf(".")+1);
		}
   	
    	var appSpecInfoResult = aa.appSpecificInfo.getByCapID(itemCap);
	if (appSpecInfoResult.getSuccess())
	 	{
		var appspecObj = appSpecInfoResult.getOutput();
		
		if (itemName != "")
			{
				while (i < appspecObj.length && !updated)
				{
					if (appspecObj[i].getCheckboxDesc() == itemName && (!useAppSpecificGroupName || appspecObj[i].getCheckboxType() == itemGroup))
					{
						appspecObj[i].setChecklistComment(itemValue);
						var actionResult = aa.appSpecificInfo.editAppSpecInfos(appspecObj);
						if (!actionResult.getSuccess()) 
						{
							logDebug("**ERROR: Setting the app spec info item " + itemName + " to " + itemValue + " .\nReason is: " +   actionResult.getErrorType() + ":" + actionResult.getErrorMessage());
						}
						updated = true;
//						AInfo[itemName] = itemValue;  // Update array used by this script
					}
					i++;
				} // while loop
			} // item name blank
		} // got app specific object	
		else
		{ logDebug( "**ERROR: getting app specific info for Cap : " + appSpecInfoResult.getErrorMessage()) }
	}
