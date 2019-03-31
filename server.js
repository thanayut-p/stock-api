var express = require('express');
var app = express();
var morgan = require('morgan');
const url = require('url');
const request = require('sync-request');
const jsdom = require("jsdom");
    
Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP;

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      if (err) {
        console.log('Error running count. Message:\n'+err);
      }
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

// .........................................................................................
// Stock price API starts from this line
app.get('/price', function (req, res) {
  if (req.query.q) {
    res.json(getQuotesPrice(req.query.q));
  } else {
      res.send("<center><br><br><br><br>"+ 
              "<h2><font color=red>Please add some quotes to the request</font></h2>"+
              "<br><h3>Example: [root]/price?q=KBANK,PTT,TTW</h4></center>");
  }
});

function getQuotesPrice(quotes) {
  var stocks = String(quotes).toUpperCase().split(',');
  var prices = [];
  var data;
  stocks.forEach(function(stock) {
      data = getStockPrice(stock);
      prices.push({s:stock, p:data.p, c:data.c, cp:data.cp});
  });
  return prices;
}

// get stock price from settrade.com
const sourceURL = 'http://www.settrade.com/C04_01_stock_quote_p1.jsp?txtSymbol=';
const { JSDOM } = jsdom;

function getStockPrice(stock) {
  try {
      var price, change, percentChange;
      var res = request('GET', sourceURL+stock);
      var dom = new JSDOM(res.body.toString('utf-8'));

      // Try latest price first
      price = String(dom.window.document.getElementsByTagName('h1')[1].innerHTML).trim();
      if(price == '-'){
          // Return latest close price if latest price is not available
          price = String(dom.window.document.getElementsByTagName('td')[1].innerHTML).trim();
          return {"p":Number(price), "c":-1, "cp":-1};
      } else {
        change = String(dom.window.document.getElementsByTagName('h1')[2].textContent).trim();
        percentChange = String(dom.window.document.getElementsByTagName('h1')[3].innerHTML).trim();
        return {"p":Number(price), 
                "c":Number(change), 
                "cp":Number(percentChange.substr(0, percentChange.length-1))};
      }
  } catch (ex) {
      console.log(ex);
      return {"p":-1, "c":-1, "cp":-1};
  }
}

// .........................................................................................
// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
