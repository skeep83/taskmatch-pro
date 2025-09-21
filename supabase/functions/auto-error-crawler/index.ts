import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrawlConfig {
  maxDepth: number;
  maxPages: number;
  includeJavaScript: boolean;
  checkPerformance: boolean;
  followExternalLinks: boolean;
  userAgent: string;
  delayBetweenRequests: number;
}

interface CrawlResult {
  url: string;
  status: 'success' | 'error' | 'warning';
  responseTime: number;
  errors: Array<{
    type: string;
    message: string;
    stack?: string;
    severity: 'critical' | 'error' | 'warning';
  }>;
  timestamp: string;
}

class WebCrawler {
  private visitedUrls = new Set<string>();
  private urlQueue: Array<{ url: string; depth: number }> = [];
  private results: CrawlResult[] = [];
  private config: CrawlConfig;
  private baseUrl: string;

  constructor(startUrl: string, config: CrawlConfig) {
    this.config = config;
    this.baseUrl = new URL(startUrl).origin;
    this.urlQueue.push({ url: startUrl, depth: 0 });
  }

  async crawl(): Promise<CrawlResult[]> {
    console.log(`Starting crawl from ${this.baseUrl} with config:`, this.config);

    while (this.urlQueue.length > 0 && this.results.length < this.config.maxPages) {
      const { url, depth } = this.urlQueue.shift()!;

      if (this.visitedUrls.has(url) || depth > this.config.maxDepth) {
        continue;
      }

      this.visitedUrls.add(url);

      try {
        const result = await this.crawlPage(url, depth);
        this.results.push(result);

        // Add delay between requests
        if (this.config.delayBetweenRequests > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenRequests));
        }
      } catch (error) {
        console.error(`Failed to crawl ${url}:`, error);
        
        this.results.push({
          url,
          status: 'error',
          responseTime: 0,
          errors: [{
            type: 'Crawl Error',
            message: error.message || 'Failed to crawl page',
            severity: 'error'
          }],
          timestamp: new Date().toISOString()
        });
      }
    }

    return this.results;
  }

  private async crawlPage(url: string, depth: number): Promise<CrawlResult> {
    const startTime = Date.now();
    const errors: CrawlResult['errors'] = [];

    try {
      console.log(`Crawling: ${url} (depth: ${depth})`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const responseTime = Date.now() - startTime;

      // Check HTTP status
      if (!response.ok) {
        errors.push({
          type: 'HTTP Error',
          message: `HTTP ${response.status}: ${response.statusText}`,
          severity: response.status >= 500 ? 'critical' : 'error'
        });
      }

      // Check response time
      if (this.config.checkPerformance && responseTime > 3000) {
        errors.push({
          type: 'Performance Issue',
          message: `Slow response time: ${responseTime}ms`,
          severity: responseTime > 5000 ? 'error' : 'warning'
        });
      }

      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('text/html')) {
        const html = await response.text();
        
        // Extract and analyze links
        if (depth < this.config.maxDepth) {
          await this.extractLinks(html, url, depth);
        }

        // Check for JavaScript errors in HTML
        if (this.config.includeJavaScript) {
          this.analyzeJavaScriptErrors(html, errors);
        }

        // Check for missing resources
        this.checkMissingResources(html, errors);

        // Check for accessibility issues
        this.checkAccessibilityIssues(html, errors);

        // Check for security issues
        this.checkSecurityIssues(html, response.headers, errors);
      }

      return {
        url,
        status: errors.length > 0 ? (errors.some(e => e.severity === 'critical') ? 'error' : 'warning') : 'success',
        responseTime,
        errors,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        url,
        status: 'error',
        responseTime: Date.now() - startTime,
        errors: [{
          type: 'Network Error',
          message: error.message || 'Failed to fetch page',
          severity: 'critical'
        }],
        timestamp: new Date().toISOString()
      };
    }
  }

  private async extractLinks(html: string, currentUrl: string, currentDepth: number) {
    const linkRegex = /<a[^>]+href=['"](https?:\/\/[^'"]+|\/[^'"]*)['"]/gi;
    const matches = html.matchAll(linkRegex);

    for (const match of matches) {
      try {
        const href = match[1];
        let fullUrl: string;

        if (href.startsWith('http')) {
          fullUrl = href;
          // Skip external links unless configured to follow them
          if (!this.config.followExternalLinks && !href.startsWith(this.baseUrl)) {
            continue;
          }
        } else if (href.startsWith('/')) {
          fullUrl = this.baseUrl + href;
        } else {
          continue; // Skip relative links for simplicity
        }

        if (!this.visitedUrls.has(fullUrl) && this.urlQueue.length < this.config.maxPages * 2) {
          this.urlQueue.push({ url: fullUrl, depth: currentDepth + 1 });
        }
      } catch (error) {
        console.warn('Failed to process link:', href, error);
      }
    }
  }

  private analyzeJavaScriptErrors(html: string, errors: CrawlResult['errors']) {
    // Check for common JavaScript patterns that might cause errors
    const jsPatterns = [
      { pattern: /console\.error\([^)]+\)/gi, type: 'Console Error', severity: 'warning' as const },
      { pattern: /throw new Error\([^)]+\)/gi, type: 'Thrown Error', severity: 'error' as const },
      { pattern: /undefined\./, type: 'Undefined Reference', severity: 'error' as const },
      { pattern: /null\.[a-zA-Z]/, type: 'Null Reference', severity: 'error' as const },
    ];

    for (const { pattern, type, severity } of jsPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        errors.push({
          type: `JavaScript ${type}`,
          message: `Found ${matches.length} potential ${type.toLowerCase()} issue(s)`,
          severity
        });
      }
    }
  }

  private checkMissingResources(html: string, errors: CrawlResult['errors']) {
    // Check for broken image references
    const imgRegex = /<img[^>]+src=['"](https?:\/\/[^'"]+|\/[^'"]*)['"]/gi;
    const matches = html.matchAll(imgRegex);
    
    for (const match of matches) {
      const src = match[1];
      if (src.includes('404') || src.includes('not-found') || src.includes('missing')) {
        errors.push({
          type: 'Missing Resource',
          message: `Potentially missing image: ${src}`,
          severity: 'warning'
        });
      }
    }
  }

  private checkAccessibilityIssues(html: string, errors: CrawlResult['errors']) {
    // Check for missing alt attributes
    const imgWithoutAlt = /<img(?![^>]*alt=)[^>]*>/gi;
    const matches = html.match(imgWithoutAlt);
    
    if (matches && matches.length > 0) {
      errors.push({
        type: 'Accessibility Issue',
        message: `Found ${matches.length} images without alt attributes`,
        severity: 'warning'
      });
    }

    // Check for missing form labels
    const inputWithoutLabel = /<input(?![^>]*aria-label)(?![^>]*id=["'][^"']*["'][^>]*>.*?<label[^>]*for=["'][^"']*["'])[^>]*>/gi;
    const inputMatches = html.match(inputWithoutLabel);
    
    if (inputMatches && inputMatches.length > 0) {
      errors.push({
        type: 'Accessibility Issue',
        message: `Found ${inputMatches.length} form inputs without proper labels`,
        severity: 'warning'
      });
    }
  }

  private checkSecurityIssues(html: string, headers: Headers, errors: CrawlResult['errors']) {
    // Check for missing security headers
    const securityHeaders = [
      'content-security-policy',
      'x-frame-options',
      'x-content-type-options',
      'strict-transport-security'
    ];

    const missingHeaders = securityHeaders.filter(header => !headers.has(header));
    
    if (missingHeaders.length > 0) {
      errors.push({
        type: 'Security Issue',
        message: `Missing security headers: ${missingHeaders.join(', ')}`,
        severity: 'warning'
      });
    }

    // Check for inline scripts (potential XSS risk)
    const inlineScripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi);
    if (inlineScripts && inlineScripts.length > 5) {
      errors.push({
        type: 'Security Issue',
        message: `Found ${inlineScripts.length} inline scripts (potential XSS risk)`,
        severity: 'warning'
      });
    }
  }
}

serve(async (req) => {
  console.log('Auto Error Crawler function called with method:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Auth client for user verification
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    // Service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Verify user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { startUrl, config } = await req.json();

    if (!startUrl) {
      return new Response(
        JSON.stringify({ error: 'Start URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting crawl for URL: ${startUrl}`);

    // Create crawler instance
    const crawler = new WebCrawler(startUrl, config);
    
    // Start crawling
    const results = await crawler.crawl();

    console.log(`Crawl completed. Found ${results.length} pages with ${results.reduce((sum, r) => sum + r.errors.length, 0)} total errors`);

    // Auto-publish critical errors to logs
    const criticalErrors = results.filter(r => 
      r.errors.some(e => e.severity === 'critical' || e.severity === 'error')
    );

    if (criticalErrors.length > 0) {
      const logsToPublish = [];
      for (const result of criticalErrors) {
        for (const error of result.errors) {
          logsToPublish.push({
            level: error.severity,
            source: 'auto-crawler',
            message: `${error.type}: ${error.message}`,
            user_id: user.id,
            metadata: {
              url: result.url,
              responseTime: result.responseTime,
              scanTimestamp: result.timestamp,
              userAgent: config.userAgent,
              crawlerConfig: config
            },
            stack_trace: error.stack
          });
        }
      }

      try {
        const { error: logsError } = await supabaseAdmin.functions.invoke('admin-logs', {
          body: {
            action: 'bulk_create',
            logs: logsToPublish
          }
        });

        if (logsError) {
          console.error('Failed to auto-publish errors to logs:', logsError);
        } else {
          console.log(`Auto-published ${logsToPublish.length} critical errors to logs`);
        }
      } catch (error) {
        console.error('Failed to auto-publish errors:', error);
      }
    }

    // Log admin action
    await supabaseAdmin.rpc('log_admin_action', {
      admin_user_id: user.id,
      action: 'auto_error_crawl',
      resource_type: 'crawler',
      resource_id: null,
      details: { 
        startUrl, 
        config, 
        results: results.length,
        totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0)
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        estimatedPages: config.maxPages,
        summary: {
          totalPages: results.length,
          totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
          criticalErrors: results.reduce((sum, r) => sum + r.errors.filter(e => e.severity === 'critical').length, 0),
          errorPages: results.filter(r => r.status === 'error').length,
          warningPages: results.filter(r => r.status === 'warning').length,
          successPages: results.filter(r => r.status === 'success').length
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto Error Crawler Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});