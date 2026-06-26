<?xml version="1.0" encoding="UTF-8"?>
<!--
  CarDost — pretty XSL renderer for /sitemap.xml.
  Browsers apply this stylesheet automatically when they open the XML;
  Google and other crawlers ignore it and read the raw <urlset>.
-->
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" indent="yes" encoding="UTF-8"/>
  <xsl:template match="/">
    <html>
      <head>
        <title>CarDost — XML Sitemap</title>
        <meta charset="UTF-8"/>
        <meta name="robots" content="noindex"/>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 32px 24px; background: #f5f4f0; color: #1c1917; }
          .wrap { max-width: 1100px; margin: 0 auto; }
          h1 { margin: 0 0 4px; font-size: 28px; letter-spacing: -0.01em; }
          .sub { color: #78716c; margin-bottom: 24px; font-size: 14px; }
          .count { display: inline-block; background: #1c1917; color: #fafaf9; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; margin-left: 8px; }
          table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e7e5e4; }
          th { background: #1c1917; color: #fafaf9; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
          tr:last-child td { border-bottom: none; }
          tr:hover td { background: #fafaf9; }
          a { color: #4f46e5; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .meta { color: #78716c; font-size: 12px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: #fef3c7; color: #92400e; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>
            CarDost — XML Sitemap
            <span class="count"><xsl:value-of select="count(s:urlset/s:url)"/> URLs</span>
          </h1>
          <p class="sub">This file lists every page on cardost.in for search engines. Generated automatically on every deploy. The raw XML is what Google reads — this view is just for humans.</p>
          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th>Last Modified</th>
                <th>Change Frequency</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="s:urlset/s:url">
                <tr>
                  <td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
                  <td class="meta"><xsl:value-of select="s:lastmod"/></td>
                  <td><span class="badge"><xsl:value-of select="s:changefreq"/></span></td>
                  <td class="meta"><xsl:value-of select="s:priority"/></td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
