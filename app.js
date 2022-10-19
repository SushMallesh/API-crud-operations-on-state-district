const express = require("express");
const { open } = require("sqlite");
const path = require("path");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
let database = null;

const dbPath = path.join(__dirname, "covid19India.db");
const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000");
    });
  } catch (err) {
    console.log(`DB Error: ${err.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//convert db to response
const convertDbToResponseOfStateTable = (stateOb) => {
  return {
    stateId: stateOb.state_id,
    stateName: stateOb.state_name,
    population: stateOb.population,
  };
};
const convertDbToResponseOfDistrictTable = (districtOb) => {
  return {
    districtId: districtOb.district_id,
    districtName: districtOb.district_name,
    stateId: districtOb.state_id,
    cases: districtOb.cases,
    cured: districtOb.cured,
    active: districtOb.active,
    deaths: districtOb.deaths,
  };
};

// API to get a list of all states
app.get("/states/", async (request, response) => {
  const getStateListQuery = `
    SELECT * FROM state;`;
  const statesList = await database.all(getStateListQuery);
  response.send(
    statesList.map((eachState) => convertDbToResponseOfStateTable(eachState))
  );
});

// API to get state based on stateId
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT *
    FROM state
    WHERE state_id = ${stateId};
    `;
  const state = await database.get(getStateQuery);
  response.send(convertDbToResponseOfStateTable(state));
});

// API to create a district in the district table

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const getCreateQuery = `
    INSERT INTO district
    (district_name,state_id,cases,cured,active,deaths)
    VALUES ('${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths});`;
  const dbResponse = await database.run(getCreateQuery);
  const districtId = dbResponse.lastID;
  response.send("District Successfully Added");
});

//API to get district based on districtId
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT *
    FROM district
    WHERE district_id = ${districtId};`;
  const district = await database.get(getDistrictQuery);
  response.send(convertDbToResponseOfDistrictTable(district));
});

//API to remove district

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDeleteQuery = `
    DELETE FROM district WHERE district_id = ${districtId};`;
  await database.run(getDeleteQuery);
  response.send("District Removed");
});

//API to update specific district based on districtId

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const getUpdateQuery = `
UPDATE district
SET
district_name = '${districtName}',
state_id = ${stateId},
cases = ${cases},
cured = ${cured},
active = ${active},
deaths = ${deaths}
WHERE district_id = ${districtId};`;
  await database.run(getUpdateQuery);
  response.send("District Details Updated");
});

// API to get statistics of table

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;

  const getStatsQuery = `
    SELECT cases,cured,active,deaths
    FROM district
    WHERE state_id = ${stateId};`;
  const statesList = await database.all(getStatsQuery);
  let statsOb = {
    totalCases: 0,
    totalCured: 0,
    totalActive: 0,
    totalDeaths: 0,
  };
  for (let state of statesList) {
    statsOb.totalCases += state.cases;
    statsOb.totalCured += state.cured;
    statsOb.totalActive += state.active;
    statsOb.totalDeaths += state.deaths;
  }
  response.send(statsOb);
});

// API to get state name based on district table

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `
SELECT state_name
FROM state INNER JOIN district ON
state.state_id = district.state_id
WHERE district.district_id = ${districtId};
`;
  const stateName = await database.get(getStateNameQuery);
  response.send({ stateName: stateName.state_name });
});

module.exports = app;
