const crypto = require('crypto');

const handleConditionalGet = (req, res, data) => {
    const jsonString = JSON.stringify(data);
    const etag = crypto.createHash('md5').update(jsonString).digest('hex');
    
    res.setHeader('ETag', `"${etag}"`);

    const ifNoneMatch = req.header('If-None-Match');
    if (ifNoneMatch && ifNoneMatch === `"${etag}"`) {
        return res.status(304).end();
    }

    let lastModified;
    if (data.recorded_at) {
        lastModified = new Date(data.recorded_at).toUTCString();
    } else if (data.created_at) {
        lastModified = new Date(data.created_at).toUTCString();
    }

    if (lastModified) {
        res.setHeader('Last-Modified', lastModified);
        const ifModifiedSince = req.header('If-Modified-Since');
        if (ifModifiedSince) {
            const clientDate = new Date(ifModifiedSince);
            const serverDate = new Date(lastModified);
            // If client has a valid date and resource hasn't changed since
            if (clientDate >= serverDate) {
                return res.status(304).end();
            }
        }
    }

    res.json(data);
};

module.exports = {
    handleConditionalGet
};
