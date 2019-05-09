'use strict'


const nativefetch = window.fetch;
var isLoginProcessStarted = false;


var Queue = function () {
    this.queue = [];
    this.push = function (item) {
        this.queue.push(item);
    }

    this.pop = function () {
        return this.queue.shift(0);
    }
}

var requestQueue = new Queue();

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function getCookie(name) {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length == 2) {
        return parts.pop().split(";").shift();
    } else {
        return null;
    }

}

function addtoken() {
    var authCookie = decodeURIComponent(getCookie("Spiffy_Session"));
    if (authCookie != null) {
        var token = "Bearer " + authCookie.split(',')[1];
        return token;
    } else {
        return {};
    }
}
window.fetch = function (args) {
    let newRequest;
    if (typeof args === "object") {
        newRequest = args.clone();
    } else {
        newRequest = args;
    }

    return new Promise(function (resolve, reject) {
        var token = addtoken();

        if (typeof args === "object" && newRequest.headers) {
            if (token != undefined) {
                newRequest.headers.set("Authorization", token);
            }
        } else {
            let headers = new Headers({
                'Authorization': token
            });
            let options = {
                method: 'GET'
                , headers: headers
            }
            newRequest = new Request(newRequest, options);
        }
        nativefetch(newRequest)
            .then(function (response) {
                if (response.status == 401) {
                    startAuthentacation(resolve, args);

                } else {
                    resolve(response);
                }
            })
            .catch(function (error) {
                reject(error);

            })
    });
}

function startAuthentacation(resolve, args) {
    let logFailedcalls = () => {
        isLoginProcessStarted = false;
        resolve(fetch(args));
    }

    requestQueue.push(logFailedcalls);
    if (!isLoginProcessStarted) {
        var retrycalls = () => {
            //retry all a calls ;
            let req = requestQueue.pop();
            while (req != undefined) {
                req();
                req = requestQueue.pop();
            };
        }
        openopsUrl(retrycalls);
    }

}

function openopsUrl(retrycalls) {
    isLoginProcessStarted = true;
    var loginSuccessCallBack = (response) => {
        setToken_RemoveLoginFrame(response, loginSuccessCallBack, retrycalls);
    }
    var loginErrorCallBack = () => {

    }
    showAuthencationFrame(loginSuccessCallBack);


}

function setToken_RemoveLoginFrame(response, loginSuccessCallBack, retrycalls) {
    let oauthframe = document.getElementById("oauthframe");
    if (oauthframe != null) oauthframe.parentNode.removeChild(oauthframe);
    if (response != undefined && response != null && typeof response != "string") {
        if (response.data != undefined && response.data != null && typeof response.data == "string") {
            response = response.data;
            retrycalls();
        } else {
            showAuthencationFrame(loginSuccessCallBack);
        }
    } else {
        showAuthencationFrame(loginSuccessCallBack);
    }

}


function showAuthencationFrame(loginSuccessCallBack) {
    window.addEventListener('message', loginSuccessCallBack, false);
    let oauthframe = document.createElement("IFRAME");
    oauthframe.setAttribute('id', 'oauthframe');
    oauthframe.setAttribute('seamless', 'true');
    oauthframe.setAttribute('class', 'level-max');
    oauthframe.setAttribute('src', window.appContext.Authorize + "?redirect_uri=" + window.appContext.RedirectUrl + "&client_id=forms&response_type=token");
    oauthframe.setAttribute('style', 'position: fixed;left: 0px;top: 0px;width: 100%;height: 100%;z-index: 5000;');
    document.body.appendChild(oauthframe);

}
