const http = require('http');
const app = require('express');
const bodyParser = require('body-parser')
const mysql = require('mysql');
const util = require("util");
const path = require('path');

// Port to connect to website
const port = process.env.PORT || 8080;

// Creates a connection string to the GCP SQL Database
const connection = mysql.createConnection({
    socketPath: "/cloudsql/cinic-web-cloud-application:europe-southwest1:cloud-database",
    host: "34.175.8.230",
    user: "clinicstaff",
    password: "clinicexpress123",
    database: "clinicexpressdb"
});

// Submits query into database
const query = util.promisify(connection.query).bind(connection);

const router = app();
router.use(app.static('public'));
var jsonParser = bodyParser.json()


// Old function to query the database used for on prem
function queryDatabase(query, values) {
    return new Promise((resolve, reject) => {
      pool.query(query, values, (error, results, fields) => {
        if (error) {
          return reject(error);
        }
        resolve(results);
      });
    });
}

// JavaScript function to create a booking for a patient 
async function createNewBooking(firstname, surname, reqDate, reqTime){
    responseCode = 200; // Default response code
    // This fetches the Patient ID
    try {
        var patientID = await query("SELECT Patient_ID FROM Patients WHERE First_Name = '" + firstname + "' AND Last_Name = '" + surname + "';"); // Executes SQL Statement
        if(patientID.length < 1 || patientID == undefined){
            responseCode = 404; // If no patients are found
        }
    } catch (error){
        responseCode = 500; // If SQL has errors
    }

    var pid = "" 
    let result = Object.values(JSON.parse(JSON.stringify(patientID))); // Brings back a list of Patient IDs
    result.forEach((patient) => pid = patient.Patient_ID); // Iterates of Patient IDs

    if(responseCode == 200){
        // Use Patient ID as a dynamic value in the new query below 
        try {    
            var results = await query("INSERT INTO Appointments (Patient_ID, ClinicStaff_ID, Date, Time)" + 
                                        "VALUES (" + pid + ", 1, '" + reqDate + "', '" + reqTime + "');"); // Execute SQL Statement       
        } catch (error){
            responseCode = 500; // If SQL has errors
        }
    }

    jsonResponse = {}
    // Depending on response code, returns different messages to front end as an alert
    if(responseCode == 200){ 
        jsonResponse = {"ResponseCode": "Successful", "ResponseMessage": "Booking successful"}
    } else if (responseCode == 404){
        jsonResponse = {"ResponseCode": "Failed", "ResponseMessage": "Patient does not exist, please add to patients before creating booking."}
    } else {
        jsonResponse = {"ResponseCode": "Failed", "ResponseMessage": "Failed to create booking, please contact system administrator."}
    }
    
    return jsonResponse;
}

// JavaScript function to cancel booking for a patient
async function cancelBooking(firstname, surname, reqDate, reqTime){
    responseCode = 200;
    
    queryStatement = "DELETE a FROM Appointments a INNER JOIN Patients p ON a.Patient_ID = p.Patient_ID " + // Build SQL Query string
                        "WHERE p.First_Name = '" + firstname + "' " +
                        "AND p.Last_Name = '" + surname + "' " + 
                        "AND a.Date = '" + reqDate + "' " + 
                        "AND a.Time = '" + reqTime + "';";

    try {    
        var results = await query(queryStatement); // Execute SQL Statement and store results
        if(results.length < 1 || results == undefined){
            responseCode = 404;
        }                 
    } catch (error){
        responseCode = 500;
    }

    jsonResponse = {}
    // Depending on response code, returns different messages to front end as an alert 
    if(responseCode == 200){
        jsonResponse = {"ResponseCode": "Successful", "ResponseMessage": "Successfully cancelled appointment for " + firstname + " " + surname + "."}
    } else if (responseCode == 404){
        jsonResponse = {"ResponseCode": "Failed", "ResponseMessage": "cannot find appointment for " + firstname + " " + surname + "."}
    } else {
        jsonResponse = {"ResponseCode": "Failed", "ResponseMessage": "Failed to cancel booking, please contact system administrator."}
    }
    
    return jsonResponse;
}
// JavaScript function to search booking for a patient
async function searchBooking(firstname, surname, reqDate){ 
    responseCode = 200;
    queryStatement = "SELECT * FROM Appointments a INNER JOIN Patients p ON a.Patient_ID = p.Patient_ID WHERE " 

    if(firstname != "" && surname != "" && reqDate == ""){ // for searching on firstname and last name
        queryStatement += "p.First_Name = '" + firstname + "' AND p.Last_Name = '" + surname + "';" // Creates SQL string
    } else if(firstname == "" && surname == "" && reqDate != ""){ // for searching on date only
        queryStatement += "a.Date = '" + reqDate + "';" // Creates SQL String
    } else { // searching on both name and date
        queryStatement += "p.First_Name = '" + firstname + "' AND p.Last_Name = '" + surname + "' AND a.Date = '" + reqDate + "';" // Creates SQL string
    }

    try {    
        var results = await query(queryStatement); // Executes SQL 
        if(results.length < 1 || results == undefined){
            responseCode = 404;
        }
        
        for(var i=0; i<results.length; i++){ // Iterates number of results found
            console.log(results[i])
        }
        
    } catch (error){
        responseCode = 500;
    }

    jsonResponse = {}
    // Depending on response code, returns different messages to front end as an alert 
    if(responseCode == 200){
        jsonResponse = results
    } else if (responseCode == 404){
        jsonResponse = {"ResponseCode": "Failed", "ResponseMessage": "cannot find appointment for " + firstname + " " + surname + "."}
    } else {
        jsonResponse = {"ResponseCode": "Failed", "ResponseMessage": "Failed to search for booking, please contact system administrator."}
    }
    
    return jsonResponse;
}
// JavaScript function to create a patient 
async function createNewPatient(firstname, surname, dob, phone, address, email){
    responseCode = 200; // Default response code
    var statement  = "INSERT INTO Patients (First_Name, Last_Name, Date_Of_Birth, Phone_Number, Address, Email)" + 
        " VALUES ('" + firstname + "', '" + surname + "', '" + dob + "', '" + phone + "', '" + address + "', '" + email + "');" // Creates SQL String
 
    try {    
        var results = await query(statement); // Executes SQL statement       
    } catch (error){
        responseCode = 500; // If SQL has errors
    }

    jsonResponse = {}
    // Depending on response code, returns different messages to front end as an alert
    if(responseCode == 200){
        jsonResponse = {"ResponseCode": "Successful", "ResponseMessage": "Successfully enlisted new patient.y"}
    } else if (responseCode == 404){
        jsonResponse = {"ResponseCode": "Failed", "ResponseMessage": "Patient does not exist, please add to patients before creating booking."}
    } else {
        jsonResponse = {"ResponseCode": "Failed", "ResponseMessage": "Failed to create booking, please contact system administrator."}
    }
    
    return jsonResponse;
}

// Listens to the port

router.listen(port, () => {
    console.log(`Server listening on port ${port}`)
});

/////////////////////////////////////////////////
// Front end routes (RETURNS HTML PAGE FOR USERS)
/////////////////////////////////////////////////

router.get('/',(req, res) => { // Load default login.html page
    res.statusCode = 200;
    console.log("Running homepage")
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, 'www/login.html'));
});

router.get('/index',(req, res) => { // Load index.html page
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, 'www/index.html'));
});

router.get('/booking',(req, res) => { // Load book.html page
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, 'www/book.html'));
});

router.get('/cancel-booking',(req, res) => { // Load cancel.html page
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, 'www/cancel.html'));
});

router.get('/search-booking',(req, res) => { // Load search.html page
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, 'www/search.html'));
});

router.get('/create-patient',(req, res) => { // Load createPatient.html page
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, 'www/createPatient.html'));
});

/////////////////////////////////////////////////
//                    END                      //
/////////////////////////////////////////////////



/////////////////////////////////////////////////
//BACKEND END ROUTES (SUBMITS AND PROCESSES DATA)
/////////////////////////////////////////////////

router.post('/authenticate', jsonParser, async (req, res) => {
    var validUsername = "clinicstaff" // Only username that is valid
    var validPassword = "clinicexpress123" // Only password that is valid
    
    var username = req.body.username // Front end user input submitted to the backend
    var password = req.body.password // Front end user input submitted to the backend

    res.setHeader('Access-Control-Allow-Origin', '*'); // Returns header
    res.setHeader('Content-Type', 'text/html'); // Returns header

    if(username == validUsername && password == validPassword){ // Checks the valid user and returns json object to frontend
        res.json({"ResponseCode": 200, "ResponseMessage": "Successfully logged in"});
    } else {    
        res.json({"ResponseCode": 401, "ResponseMessage": "Invalid credentials please try again."});
    }
});

router.post('/book-appointment', jsonParser, async (req, res) => {
    var name = req.body.name // Front end user input submitted to the backend
    var fname = name.split(" ")[0] // Separates name into 2 separate strings
    var lname = name.split(" ")[1] // Separates name into 2 separate strings
    var bookingResponse = await createNewBooking(fname, lname, req.body.date, req.body.time); // Inserts into the database

    res.setHeader('Access-Control-Allow-Origin', '*'); // Returns header   
    res.setHeader('Content-Type', 'text/html'); // Returns header
    res.statusCode = 200;    
    res.json(bookingResponse); // Returns json object to frontend

});

router.post('/cancel-appointment', jsonParser, async (req, res) => {
    var name = req.body.name // Front end user input submitted to the backend
    var fname = name.split(" ")[0] // Separates name into 2 separate strings
    var lname = name.split(" ")[1] // Separates name into 2 separate strings
    var bookingResponse = await cancelBooking(fname, lname, req.body.date, req.body.time); // Deletes record from database

    res.setHeader('Access-Control-Allow-Origin', '*'); // Returns header 
    res.setHeader('Content-Type', 'text/html'); // Returns header 
    res.statusCode = 200;    
    res.json(bookingResponse); // Returns json object to frontend

});

router.post('/search-appointment', jsonParser, async (req, res) => {
    var fname = req.body.firstname // Front end user input submitted to the backend
    var lname = req.body.lastname // Front end user input submitted to the backend
    var bookingDate = req.body.bookingDate // Front end user input submitted to the backend
    var bookingResponse = await searchBooking(fname, lname, bookingDate); // Selects booking from database

    res.setHeader('Access-Control-Allow-Origin', '*'); // Returns header   
    res.setHeader('Content-Type', 'text/html'); // Returns header 
    res.statusCode = 200;    
    res.json(bookingResponse); // Returns json object to frontend

});

router.post('/create-patient-record', jsonParser, async (req, res) => {
    var fname = req.body.firstname // Front end user input submitted to the backend
    var lname = req.body.surname // Front end user input submitted to the backend
    var dob = req.body.dob // Front end user input submitted to the backend
    var phone = req.body.phone // Front end user input submitted to the backend
    var address = req.body.address // Front end user input submitted to the backend
    var email = req.body.email // Front end user input submitted to the backend

    var patientResponse = await createNewPatient(fname, lname, dob, phone, address, email); // Inserts patient into database

    res.setHeader('Access-Control-Allow-Origin', '*'); // Returns header    
    res.setHeader('Content-Type', 'text/html'); // Returns header
    res.statusCode = 200;    
    res.json(patientResponse); // Returns json object to frontend

});

/////////////////////////////////////////////////
//                    END                      //
/////////////////////////////////////////////////