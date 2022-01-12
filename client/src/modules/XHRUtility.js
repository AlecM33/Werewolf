export const XHRUtility =
    {
        standardHeaders: [['Content-Type', 'application/json'], ['Accept', 'application/json'], ['X-Requested-With', 'XMLHttpRequest']],

        // Easily make XHR calls with a promise wrapper. Defaults to GET and MIME type application/JSON
        xhr (url, method = 'GET', headers, body = null) {
            if (headers === undefined || headers === null) {
                headers = this.standardHeaders;
            }
            if (typeof url !== 'string' || url.trim().length < 1) {
                return Promise.reject('Cannot request with empty URL: ' + url);
            }

            const req = new XMLHttpRequest();
            req.open(method, url.trim());

            for (const hdr of headers) {
                if (hdr.length !== 2) continue;
                req.setRequestHeader(hdr[0], hdr[1]);
            }

            return new Promise((resolve, reject) => {
                req.onload = function () {
                    const response = {
                        status: this.status,
                        statusText: this.statusText,
                        content: this.responseText
                    };
                    if (this.status >= 200 && this.status < 400) {
                        resolve(response);
                    } else {
                        reject(response);
                    }
                };
                body ? req.send(body) : req.send();
            });
        }

    };
