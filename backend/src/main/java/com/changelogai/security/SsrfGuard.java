package com.changelogai.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;

/**
 * Validates outbound URLs to prevent Server-Side Request Forgery (SSRF) attacks.
 * Blocks requests to private/internal IP ranges, link-local, loopback, and cloud metadata endpoints.
 */
public final class SsrfGuard {

    private static final Logger log = LoggerFactory.getLogger(SsrfGuard.class);

    private SsrfGuard() {}

    /**
     * Validates that the given URL does not point to an internal/private network address.
     *
     * @param url the URL to validate
     * @throws IllegalArgumentException if the URL targets a forbidden address
     */
    public static void validateUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("URL must not be empty");
        }

        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            if (host == null) {
                throw new IllegalArgumentException("Invalid URL: no host");
            }

            String scheme = uri.getScheme();
            if (scheme == null || (!scheme.equals("http") && !scheme.equals("https"))) {
                throw new IllegalArgumentException("Only http/https schemes are allowed");
            }

            // Block metadata endpoints by hostname
            if (host.equals("169.254.169.254") || host.equals("metadata.google.internal")) {
                throw new IllegalArgumentException("Access to cloud metadata service is blocked");
            }

            InetAddress addr = InetAddress.getByName(host);

            if (addr.isLoopbackAddress()) {
                throw new IllegalArgumentException("Loopback addresses are blocked");
            }
            if (addr.isLinkLocalAddress()) {
                throw new IllegalArgumentException("Link-local addresses are blocked (includes cloud metadata)");
            }
            if (addr.isSiteLocalAddress()) {
                throw new IllegalArgumentException("Private network addresses are blocked");
            }
            if (addr.isAnyLocalAddress()) {
                throw new IllegalArgumentException("Wildcard addresses are blocked");
            }

            // Additional check for Docker/internal ranges (172.16-31.x.x)
            byte[] bytes = addr.getAddress();
            if (bytes.length == 4) {
                int first = bytes[0] & 0xFF;
                int second = bytes[1] & 0xFF;
                // 10.x.x.x
                if (first == 10) {
                    throw new IllegalArgumentException("Private network (10.x.x.x) is blocked");
                }
                // 172.16.0.0 - 172.31.255.255
                if (first == 172 && second >= 16 && second <= 31) {
                    throw new IllegalArgumentException("Private network (172.16-31.x.x) is blocked");
                }
                // 192.168.x.x
                if (first == 192 && second == 168) {
                    throw new IllegalArgumentException("Private network (192.168.x.x) is blocked");
                }
                // 169.254.x.x (link-local, cloud metadata)
                if (first == 169 && second == 254) {
                    throw new IllegalArgumentException("Link-local range (169.254.x.x) is blocked");
                }
            }

        } catch (IllegalArgumentException e) {
            log.warn("SSRF blocked: {} → {}", url, e.getMessage());
            throw e;
        } catch (UnknownHostException e) {
            log.warn("SSRF check: unresolvable host in URL {}", url);
            throw new IllegalArgumentException("Cannot resolve hostname");
        }
    }

    /**
     * Returns true if the URL is safe (points to a public address), false otherwise.
     */
    public static boolean isSafe(String url) {
        try {
            validateUrl(url);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
