var http = require('http');
const url = require('url');
const request = require('sync-request');
const jsdom = require("jsdom");
var express = require('express');
var app = express();

app.set('port', process.env.OPENSHIFT_NODEJS_PORT || 8080);
app.set('ip', process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1');

http.createServer(app).listen(app.get('port'), app.get('ip'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

app.get('/*', function (req, res) {
  if (req.query.q) {
    res.json(getQuotesPrice(req.query.q));
  } else {
      res.send("<center><br><br><br><br>"+ 
              "<h2><font color=red>Please add some quotes to the request</font></h2>"+
              "<br><h3>Example: [root]/?q=KBANK,PTT,TTW</h4></center>");
  }
});

function getQuotesPrice(quotes) {
  var stocks = String(quotes).toUpperCase().split(',');
  var prices = [];
  stocks.forEach(function(stock) {
      prices.push({s:stock, p: getStockPrice(stock)});
  });
  return prices;
}

// get stock price from settrade.com
const sourceURL = 'http://www.settrade.com/C04_01_stock_quote_p1.jsp?txtSymbol=';
const { JSDOM } = jsdom;

function getStockPrice(stock) {
  try {
      var price;
      var res = request('GET', sourceURL+stock);
      var dom = new JSDOM(res.body.toString('utf-8'));

      // Try latest price first
      price = String(dom.window.document.getElementsByTagName('h1')[1].innerHTML).trim();
      if(price == '-'){
          // Return latest close price if latest price is not available
          price = String(dom.window.document.getElementsByTagName('td')[1].innerHTML).trim();
      }
      return Number(price);
  } catch (ex) {
      console.log(ex);
      return -1;
  }
}

