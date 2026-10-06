const getPaginationOptions = (req) => {
    let page = parseInt(req.query.page, 10) || 1;
    let page_size = parseInt(req.query.page_size, 10) || 50;

    if (page < 1) page = 1;
    if (page_size < 1) page_size = 1;
    if (page_size > 200) page_size = 200;

    const offset = (page - 1) * page_size;
    return { page, page_size, offset };
};

const buildPaginationLinks = (req, page, page_size, total_count) => {
    const totalPages = Math.ceil(total_count / page_size);
    const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
    const links = {};

    const buildUrl = (p) => {
        const url = new URL(baseUrl);
        for (const [key, value] of Object.entries(req.query)) {
            if (key !== 'page' && key !== 'page_size') {
                url.searchParams.append(key, value);
            }
        }
        url.searchParams.append('page', p);
        url.searchParams.append('page_size', page_size);
        return url.toString();
    };

    if (page < totalPages) links.next = buildUrl(page + 1);
    if (page > 1) links.prev = buildUrl(page - 1);

    return links;
};

module.exports = {
    getPaginationOptions,
    buildPaginationLinks
};
