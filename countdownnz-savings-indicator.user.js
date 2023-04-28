// ==UserScript==
// @name        Countdown NZ - Savings Percent
// @description Find the best savings at Countdown.co.nz. Shows the percentage saved for items on sale, with a visual invidator for how good the discount is (deeper red means deeper savings)
// @icon        https://www.countdown.co.nz/favicon.ico
// @namespace   github.com/Unfocused
// @homepageURL https://github.com/Unfocused/CountdownNZ-Savings
// @downloadURL https://raw.githubusercontent.com/Unfocused/CountdownNZ-Savings/main/countdownnz-savings.user.js
// @version     1.20230428
// @author      Unfocused
// @license     MIT
// @match       https://www.countdown.co.nz/*
// @grant       none
// ==/UserScript==

const CONFIG_LOGGING_ENABLE = true;
const CONFIG_WAITITERACTIONCOUNT_MAX = 100;

function log(msg) {
  if (!CONFIG_LOGGING_ENABLE) {
    return;
  }
  console.log(`[UserScript:Countdown-SavingsPercent] ${msg}`);
}

let waitIterationCount = 0;

let waitForReady = function (testFunc, callback) {
  let testResult = testFunc();
  if (testResult) {
    setTimeout(callback, 100);
    //callback();
  } else {
    if (waitIterationCount > CONFIG_WAITITERACTIONCOUNT_MAX) {
      return;
    }
    waitIterationCount++;

    setTimeout(function () {
      waitForReady(testFunc, callback);
    }, 500);
  }
};

function formatPercentage(percent) {
  return Math.round(percent * 100) + "%";
}

function generateColorForPrecent(percent) {
  let color = "FFFFFF";
  if (percent > 0.4) {
    color = "A91717";
  } else if (percent >= 0.3) {
    color = "E22828";
  } else if (percent >= 0.2) {
    color = "E95D5D";
  } else if (percent >= 0.1) {
    color = "F09393";
  } else {
    color = "F8C9C9";
  }
  return color;
}

function createIndicatorEl(color, content) {
  let indicatorEl = document.createElement("span");
  indicatorEl.classList.add("price");
  indicatorEl.setAttribute(
    "style",
    `font-weight: bold; text-align: center; color: #FFFFFF; background-color: #${color}; padding: 2px; border-radius: 4px;`
  );
  indicatorEl.appendChild(document.createTextNode(content));
  return indicatorEl;
}

function findProductObjInContext(node) {
  let ngContext = node.__ngContext__;
  for (let contextObj of ngContext) {
    if (!contextObj) {
      continue;
    }
    if (typeof contextObj != "object") {
      continue;
    }
    if (contextObj instanceof Node || contextObj instanceof Array) {
      continue;
    }
    if (
      "sku" in contextObj &&
      typeof contextObj.sku == "string" &&
      "price" in contextObj &&
      typeof contextObj.price == "object"
    ) {
      return contextObj;
    }
  }
}

function handleProduct(productObj, indicatorContainer) {
  let originalPrice = productObj.price.originalPrice;
  let salePrice = productObj.price.salePrice;
  let savePrice = productObj.price.savePrice;

  if (savePrice == 0) {
    log(`skipping: savePrice==0`);
    return;
  }

  let savePercent = savePrice / originalPrice;
  let savePercentFmt = formatPercentage(savePercent);
  let saveColor = generateColorForPrecent(savePercent);

  log(
    `originalPrice=${originalPrice}, salePrice=${salePrice}, savePrice=${savePrice}, savePercentFmt=${savePercentFmt}`
  );

  let indicatorEl = createIndicatorEl(saveColor, savePercentFmt);
  indicatorContainer.appendChild(indicatorEl);
}

function processPricesList() {
  const productsList = document.querySelectorAll(
    "cdx-card > product-stamp-grid"
  );
  log(`Number of products to process: ${productsList.length}`);

  productsList.forEach((productEl) => {
    try {
      // If anything breaks, it'll likely be this
      //let productObj = productEl.__ngContext__[26];
      let productObj = findProductObjInContext(productEl);
      log(`Processing item: ${productObj.name}`);

      let prevPriceEl = productEl.querySelector(
        "product-price div.previousPrice"
      );
      if (!prevPriceEl) {
        log(`skipping: prevPriceEl==null`);
        return;
      }

      handleProduct(productObj, prevPriceEl);
    } catch (e) {
      log(`Exception: ${e}`);
    }
  });
}

function testReadyList() {
  let loadingIndicators = document.querySelectorAll("cdx-wapple-loading");
  if (loadingIndicators.length > 0) {
    return false;
  }

  let productLists = document.querySelectorAll("product-grid");
  if (!productLists || productLists.length == 0) {
    return false;
  }
  for (let listEl of productLists) {
    if (listEl.dataset.loading != "false") {
      return false;
    }
    if (!listEl.children || listEl.children.length == 0) {
      return false;
    }
  }
  return true;
}

function processPricesDetail() {
  try {
    let itemDetailsEl = document.querySelector(
      "wnz-product-detail #product-details"
    );
    // If anything breaks, it'll likely be this
    //let productObj = itemDetailsEl.__ngContext__[62];
    let productObj = findProductObjInContext(itemDetailsEl);

    let prevPriceEl = itemDetailsEl.querySelector(
      "product-price .previousPrice"
    );
    if (!prevPriceEl) {
      log(`skipping: prevPriceEl==null`);
      return;
    }

    handleProduct(productObj, prevPriceEl);
  } catch (e) {
    log(`Exception: ${e}`);
  }
}

function testReadyDetail() {
  let loadingIndicators = document.querySelectorAll("cdx-wapple-loading");
  if (loadingIndicators.length > 0) {
    return false;
  }

  let itemDetailsEl = document.querySelector(
    "wnz-product-detail #product-details"
  );
  if (!itemDetailsEl) {
    return false;
  }
  prevPriceEl = itemDetailsEl.querySelector("product-price .previousPrice");
  return !!prevPriceEl;
}

if (
  document.location.href.startsWith(
    "https://www.countdown.co.nz/shop/productdetails?"
  )
) {
  waitForReady(testReadyDetail, processPricesDetail);
} else {
  waitForReady(testReadyList, processPricesList);
}
