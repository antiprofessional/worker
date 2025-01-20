export default {
    async fetch(request) {
        const url = new URL(request.url);
        const email = url.searchParams.get('email'); // Get email from URL query parameter

        if (!email) {
            return new Response(
                JSON.stringify({ error: "Missing email parameter" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Email syntax validation regex
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const isSyntaxValid = emailRegex.test(email);

        const domain = email.split('@').pop();

        // Caching check for MX records (use KV or Cache API to improve performance)
        let cacheKey = `mx_${domain}`;
        let cacheResponse = await caches.default.match(cacheKey);

        if (!cacheResponse) {
            // If not in cache, perform MX record lookup
            const dnsResponse = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`, {
                headers: { 'Accept': 'application/dns-json' }
            });

            const dnsData = await dnsResponse.json();
            const hasMXRecords = dnsData.Answer && dnsData.Answer.length > 0;

            // Store the result in cache for future use
            cacheResponse = new Response(JSON.stringify({ mx_valid: hasMXRecords }), {
                headers: { "Content-Type": "application/json" }
            });
            // Cache for 1 hour (adjust cache duration as needed)
            caches.default.put(cacheKey, cacheResponse.clone(), { expirationTtl: 3600 });
        }

        const mxValid = JSON.parse(await cacheResponse.text()).mx_valid;

        // Expanded list of disposable email domains
        const disposableDomains = [
            'mailinator.com', 'tempmail.com', 'yopmail.com', '10minutemail.com',
            'guerrillamail.com', 'throwawaymail.com', 'maildrop.cc', 'dispostable.com',
            'fakeinbox.com', 'getnada.com', 'mailsac.com', 'trashmail.com',
            'jetable.org', 'mailcatch.com', 'tmpmail.net', 'disposablemail.com',
            'instantemailaddress.com', 'spamgourmet.com', 'trashmail.io', 'spambox.us',
            'sneakemail.com', 'spambox.com', 'mailnesia.com', 'discard.email'
        ];

        const isDisposable = disposableDomains.includes(domain);

        // Construct the result
        const result = {
            email: email,
            syntax_valid: isSyntaxValid,
            disposable: isDisposable,
            mx_valid: mxValid
        };

        // Return the result as JSON
        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
