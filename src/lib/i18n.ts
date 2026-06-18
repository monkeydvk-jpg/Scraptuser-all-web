/**
 * Lightweight bilingual (VI/EN) dictionary for the Keyword Insights feature.
 * `lang` lives in the global Zustand store; use `t(lang, key)` to resolve.
 */

export type Lang = 'vi' | 'en';

type Entry = { vi: string; en: string };

export const STR: Record<string, Entry> = {
  nav_generate: { vi: 'Tạo prompt', en: 'Generate' },
  nav_analytics: { vi: 'Phân tích', en: 'Analytics' },
  nav_keywords: { vi: 'Keyword Insights', en: 'Keyword Insights' },
  nav_trends: { vi: 'Xu hướng', en: 'Trends' },
  tagline: { vi: 'Adobe Stock Suite', en: 'Adobe Stock Suite' },
  cmd_hint: { vi: 'Tìm hoặc nhảy tới…', en: 'Search or jump to…' },
  search: { vi: 'Tìm', en: 'Search' },
  cmd_theme_label: { vi: 'Giao diện', en: 'Theme' },
  cmd_nav_navigate: { vi: 'di chuyển', en: 'navigate' },
  cmd_nav_select: { vi: 'chọn', en: 'select' },
  cmd_nav_close: { vi: 'đóng', en: 'close' },

  // Trends page
  tr_title: { vi: 'Xu hướng', en: 'Trends' },
  tr_sub: {
    vi: 'Keyword & asset đang nóng theo chủ đề (ước lượng từ download/velocity). Tự làm mới mỗi giờ.',
    en: 'Hot keywords & assets by topic (estimated from downloads/velocity). Auto-refreshes hourly.',
  },
  tr_topic: { vi: 'Chủ đề', en: 'Topic' },
  tr_hot_kw: { vi: 'Keyword đang nóng', en: 'Hot keywords' },
  tr_hot_assets: { vi: 'Asset đang nóng', en: 'Hot assets' },
  tr_refresh: { vi: 'Làm mới', en: 'Refresh' },
  tr_auto: { vi: 'Tự làm mới mỗi 1h', en: 'Auto-refresh hourly' },
  tr_updated: { vi: 'Cập nhật', en: 'Updated' },
  tr_rising: { vi: 'đang lên', en: 'rising' },
  tr_just_now: { vi: 'vừa xong', en: 'just now' },
  tr_ago: { vi: 'phút trước', en: 'm ago' },
  tr_loading: { vi: 'Đang tải xu hướng…', en: 'Loading trends…' },
  tr_analyze_kw: { vi: 'Phân tích keyword này', en: 'Analyze this keyword' },

  page_title: { vi: 'Keyword Insights', en: 'Keyword Insights' },
  page_sub: {
    vi: 'Tìm keyword nhiều người tải nhưng ít cạnh tranh — biết nên sản xuất gì tiếp theo.',
    en: 'Find high-demand, low-competition keywords — know what to produce next.',
  },

  tab_topic: { vi: 'Theo chủ đề', en: 'By topic' },
  tab_creator: { vi: 'Theo creator_id', en: 'By creator_id' },
  ph_topic: {
    vi: 'vd: minimalist background, ai generated, watercolor…',
    en: 'e.g. minimalist background, ai generated, watercolor…',
  },
  ph_creator: { vi: 'vd: 203496152 (creator_id)', en: 'e.g. 203496152 (creator_id)' },
  analyze: { vi: 'Phân tích', en: 'Analyze' },
  analyzing: { vi: 'Đang phân tích…', en: 'Analyzing…' },
  filter_label: { vi: 'Loại nội dung', en: 'Content type' },
  scan_label: { vi: 'Số asset quét', en: 'Assets to scan' },
  global_comp: {
    vi: 'Đối chiếu cạnh tranh toàn thị trường (hybrid)',
    en: 'Global competition check (hybrid)',
  },

  ct_all: { vi: 'Tất cả', en: 'All' },
  ct_photo: { vi: 'Ảnh', en: 'Photos' },
  ct_illus: { vi: 'Minh hoạ', en: 'Illustrations' },
  ct_vector: { vi: 'Vector', en: 'Vectors' },
  ct_video: { vi: 'Video', en: 'Videos' },
  ct_tmpl: { vi: 'Template', en: 'Templates' },
  ct_3d: { vi: '3D', en: '3D' },

  sum_total_kw: { vi: 'Tổng keyword', en: 'Total keywords' },
  sum_top_kw: { vi: 'Keyword cơ hội cao nhất', en: 'Top opportunity keyword' },
  sum_total_dl: { vi: 'Tổng download', en: 'Total downloads' },
  sum_avg_dl: { vi: 'TB download / keyword', en: 'Avg downloads / keyword' },

  chart_bar: {
    vi: 'Top 15 keyword theo Opportunity Score',
    en: 'Top 15 keywords by Opportunity Score',
  },
  chart_scatter: {
    vi: 'Bản đồ cơ hội — Cạnh tranh × Nhu cầu',
    en: 'Opportunity map — Competition × Demand',
  },
  chart_donut: { vi: 'Tỷ trọng theo loại nội dung', en: 'Share by content type' },
  golden_zone: { vi: 'Vùng cơ hội vàng', en: 'Golden opportunity zone' },
  axis_comp: { vi: 'Cạnh tranh (số asset) →', en: 'Competition (asset count) →' },
  axis_demand: { vi: '↑ Nhu cầu (TB download)', en: '↑ Demand (avg downloads)' },

  tbl_keyword: { vi: 'Keyword', en: 'Keyword' },
  tbl_total: { vi: 'Tổng DL', en: 'Total DL' },
  tbl_assets: { vi: 'Số asset', en: 'Assets' },
  tbl_avg: { vi: 'TB / asset', en: 'Avg / asset' },
  tbl_comp: { vi: 'Cạnh tranh', en: 'Competition' },
  tbl_score: { vi: 'Opportunity Score', en: 'Opportunity Score' },
  tbl_caption: { vi: 'keyword — bấm để xem chi tiết', en: 'keywords — click a row for details' },

  comp_low: { vi: 'Thấp', en: 'Low' },
  comp_medium: { vi: 'Vừa', en: 'Medium' },
  comp_high: { vi: 'Cao', en: 'High' },

  detail_overview: { vi: 'Tổng quan', en: 'Overview' },
  detail_demand: { vi: 'Nhu cầu (TB DL)', en: 'Demand (avg DL)' },
  detail_local: { vi: 'Cạnh tranh mẫu', en: 'Sample competition' },
  detail_global: { vi: 'Cạnh tranh toàn cầu', en: 'Global competition' },
  detail_total: { vi: 'Tổng download', en: 'Total downloads' },
  detail_samples: { vi: 'Asset tiêu biểu', en: 'Representative assets' },
  detail_cta: { vi: 'Tạo prompt từ keyword này', en: 'Generate prompt from this keyword' },
  detail_score: { vi: 'Opportunity Score', en: 'Opportunity Score' },

  empty_title: { vi: 'Khám phá cơ hội keyword', en: 'Discover keyword opportunities' },
  empty_desc: {
    vi: 'Nhập chủ đề hoặc creator_id rồi bấm Phân tích. Chúng tôi quét tới 2000 asset Adobe Stock và xếp hạng keyword theo cơ hội.',
    en: 'Enter a topic or creator_id and hit Analyze. We scan up to 2,000 Adobe Stock assets and rank keywords by opportunity.',
  },
  empty_try: { vi: 'Thử nhanh:', en: 'Quick try:' },

  loading_title: { vi: 'Đang quét Adobe Stock…', en: 'Scanning Adobe Stock…' },
  loading_sub: {
    vi: 'Gom keyword & tính Opportunity Score',
    en: 'Aggregating keywords & scoring opportunity',
  },
  loading_assets: { vi: 'asset (ước lượng)', en: 'assets (estimated)' },

  err_title: { vi: 'Không lấy được dữ liệu', en: "Couldn't fetch data" },
  err_desc: {
    vi: 'Adobe Stock API phản hồi lỗi hoặc bị giới hạn tần suất. Thử lại sau giây lát.',
    en: 'Adobe Stock API returned an error or was rate-limited. Please try again shortly.',
  },
  err_retry: { vi: 'Thử lại', en: 'Retry' },

  meta_scanned: { vi: 'Đã quét', en: 'Scanned' },
  meta_of: { vi: 'trên', en: 'of' },
  meta_results: { vi: 'kết quả', en: 'results' },
  meta_time: { vi: 'Thời gian xử lý', en: 'Processing time' },

  no_results: {
    vi: 'Không tìm thấy keyword phù hợp. Thử chủ đề/creator khác.',
    en: 'No matching keywords found. Try another topic/creator.',
  },

  // ── Prompt Generator (home) ──
  gen_title: { vi: 'Tạo prompt', en: 'Prompt Generator' },
  gen_sub: {
    vi: 'Scrape tiêu đề Adobe Stock và sinh prompt AI hàng loạt theo định dạng tuỳ chỉnh.',
    en: 'Scrape Adobe Stock titles and generate AI prompts in bulk with custom formatting.',
  },

  // URL card
  url_config: { vi: 'Cấu hình URL', en: 'URL Configuration' },
  url_label: { vi: 'URL Adobe Stock:', en: 'Adobe Stock URL:' },
  url_ph: { vi: 'Nhập URL Adobe Stock…', en: 'Enter Adobe Stock URL…' },
  start_page: { vi: 'Trang bắt đầu:', en: 'Start Page:' },
  end_page: { vi: 'Trang kết thúc:', en: 'End Page:' },

  // Format card
  format_settings: { vi: 'Định dạng', en: 'Format Settings' },
  opt_includePrefix: { vi: '📝 Thêm tiền tố', en: '📝 Include Prefix' },
  opt_includeSuffix: { vi: '📎 Thêm hậu tố', en: '📎 Include Suffix' },
  opt_includeDate: { vi: '📅 Thêm ngày', en: '📅 Include Date' },
  opt_includeParams: { vi: '⚡ Thêm tham số', en: '⚡ Include Parameters' },
  opt_includeAspectRatio: { vi: '📐 Thêm tỷ lệ khung', en: '📐 Include Aspect Ratio' },
  opt_toLowerCase: { vi: '🔤 Chuyển chữ thường', en: '🔤 Convert to Lowercase' },
  opt_addEmptyLine: { vi: '↩️ Thêm dòng trống', en: '↩️ Add Empty Line' },
  f_prefix: { vi: 'Tiền tố:', en: 'Prefix:' },
  f_prefix_ph: { vi: 'Nhập tiền tố…', en: 'Enter prefix…' },
  f_generate: { vi: 'Tạo', en: 'Generate' },
  f_suffix: { vi: 'Hậu tố:', en: 'Suffix:' },
  f_suffix_ph: { vi: 'Nhập hậu tố…', en: 'Enter suffix…' },
  f_aspect: { vi: 'Tỷ lệ khung:', en: 'Aspect Ratio:' },
  f_aspect_ph: { vi: 'vd: 16:9', en: 'e.g., 16:9' },
  f_params: { vi: 'Tham số bổ sung:', en: 'Additional Parameters:' },
  f_params_ph: { vi: 'vd: --no dust --p 5y3izqx', en: 'e.g., --no dust --p 5y3izqx' },
  f_filename: { vi: 'Tên file:', en: 'Filename:' },
  f_filename_ph: { vi: 'output', en: 'output' },

  // Generate run + KPIs
  gen_run: { vi: 'Bắt đầu scrape', en: 'Run scrape' },
  gen_running: { vi: 'Đang scrape…', en: 'Scraping…' },
  gen_stop: { vi: 'Dừng', en: 'Stop' },
  gen_stopped: { vi: 'Đã dừng scrape', en: 'Scraping stopped' },
  gen_preview: { vi: 'Xem trước prompt', en: 'Prompt preview' },
  gen_download: { vi: 'Tải .txt', en: 'Download .txt' },
  gen_scanned: { vi: 'Tiêu đề đã quét', en: 'Titles scanned' },
  gen_prompts: { vi: 'Prompt đã tạo', en: 'Prompts built' },
  gen_pages_done: { vi: 'Số trang', en: 'Pages' },
  gen_rate: { vi: 'Tỉ lệ thành công', en: 'Success rate' },
  st_scanned: { vi: 'đã quét', en: 'scanned' },
  gen_empty_preview: { vi: 'Cấu hình rồi bấm "Bắt đầu scrape" để tạo prompt.', en: 'Configure and hit "Run scrape" to build prompts.' },

  // Control card
  ctrl_panel: { vi: 'Bảng điều khiển', en: 'Control Panel' },
  ctrl_progress: { vi: 'Tiến trình:', en: 'Progress:' },
  ctrl_start: { vi: 'Bắt đầu', en: 'Start' },
  ctrl_stop: { vi: 'Dừng', en: 'Stop' },
  ctrl_preview: { vi: 'Xem trước', en: 'Preview' },
  ctrl_download: { vi: 'Tải về', en: 'Download' },
  ctrl_github: { vi: 'GitHub', en: 'GitHub' },

  // Preview card
  preview_title: { vi: 'Xem trước trực tiếp', en: 'Live Preview' },
  preview_ph: { vi: 'Bản xem trước sẽ hiện ở đây…', en: 'Preview will appear here…' },
  preview_help: {
    vi: 'Bản xem trước cho thấy prompt sẽ được định dạng thế nào. Đổi cài đặt để thấy thay đổi tức thì.',
    en: 'This preview shows how your prompts will be formatted. Update any settings to see changes in real-time.',
  },

  // Stats card
  stats_title: { vi: 'Thống kê', en: 'Statistics' },
  stats_total_pages: { vi: 'Tổng số trang', en: 'Total Pages' },
  stats_prompts: { vi: 'Prompt đã tạo', en: 'Prompts Generated' },
  stats_status: { vi: 'Trạng thái', en: 'Status' },
  stats_progress: { vi: 'Tiến trình', en: 'Progress' },
  stats_ready: { vi: 'Sẵn sàng scrape', en: 'Ready to scrape' },
  stats_footer: { vi: '🌐 Bản Web V2.0 • Deploy trên Vercel', en: '🌐 V2.0 Web • Deployed on Vercel' },
  st_idle: { vi: 'chờ', en: 'idle' },
  st_scraping: { vi: 'đang scrape', en: 'scraping' },
  st_processing: { vi: 'đang xử lý', en: 'processing' },
  st_complete: { vi: 'hoàn tất', en: 'complete' },
  st_error: { vi: 'lỗi', en: 'error' },

  // Footer
  footer_tagline: { vi: '✨ Stocklytics — bộ công cụ Adobe Stock', en: '✨ Stocklytics — Adobe Stock suite' },
  footer_sub: { vi: 'Giao diện web hiện đại, xử lý thời gian thực', en: 'Modern web interface with real-time processing' },
  footer_hint: { vi: 'Nhấn ⌘K để mở bảng lệnh', en: 'Press ⌘K to open command palette' },

  // Command palette
  cmd_placeholder: { vi: 'Tìm lệnh hoặc trang…', en: 'Search commands or pages…' },
  cmd_nav: { vi: 'Đi tới', en: 'Go to' },
  cmd_theme: { vi: 'Giao diện', en: 'Theme' },
  cmd_lang: { vi: 'Ngôn ngữ', en: 'Language' },
  cmd_empty: { vi: 'Không có kết quả', en: 'No results' },
  cmd_lang_vi: { vi: 'Tiếng Việt', en: 'Vietnamese' },
  cmd_lang_en: { vi: 'Tiếng Anh', en: 'English' },

  // Analytics page + search + summary
  an_title: { vi: 'Phân tích Stock', en: 'Stock Analytics' },
  an_sub: {
    vi: 'Tra cứu portfolio theo creator hoặc keyword: download, xu hướng, thu nhập ước tính.',
    en: 'Explore a portfolio by creator or keyword: downloads, trends, estimated earnings.',
  },
  an_creator: { vi: 'Creator ID', en: 'Creator ID' },
  an_keyword: { vi: 'Keyword', en: 'Keyword' },
  an_ph_creator: { vi: 'Nhập creator ID (vd 211716350)', en: 'Enter creator ID (e.g. 211716350)' },
  an_ph_keyword: { vi: 'Nhập keyword (vd oil pump)', en: 'Enter keyword (e.g. oil pump)' },
  an_filter: { vi: 'Lọc:', en: 'Filter:' },
  an_search: { vi: 'Tìm', en: 'Search' },
  an_perpage: { vi: '/ trang', en: '/ page' },
  an_empty_title: {
    vi: 'Nhập Creator ID hoặc Keyword để bắt đầu phân tích',
    en: 'Enter a Creator ID or Keyword to start analyzing',
  },
  an_empty_sub: {
    vi: 'Theo dõi download, keyword, ngày upload và hơn thế',
    en: 'Track downloads, keywords, upload dates, and more',
  },
  // Analytics (redesign)
  an_search_ph: { vi: 'Nhập creator_id hoặc keyword…', en: 'Enter creator_id or keyword…' },
  an_analyze: { vi: 'Phân tích', en: 'Analyze' },
  an_try: { vi: 'Thử nhanh', en: 'Quick try' },
  an_kpi_assets: { vi: 'Tổng asset', en: 'Total assets' },
  an_kpi_downloads: { vi: 'Tổng download', en: 'Total downloads' },
  an_kpi_avg: { vi: 'TB / asset', en: 'Avg / asset' },
  an_kpi_monthly: { vi: 'Download / tháng', en: 'Downloads / month' },
  an_timeline: { vi: 'Download theo tháng', en: 'Downloads by month' },
  an_mix: { vi: 'Tỷ trọng loại nội dung', en: 'Content-type mix' },
  an_top: { vi: 'Asset nổi bật', en: 'Top performing assets' },
  an_topdl: { vi: 'Top download', en: 'Top downloads' },
  an_topdl_sub: { vi: 'xếp theo lượt tải', en: 'ranked by downloads' },
  an_sort: { vi: 'Đổi cách sắp xếp', en: 'Change sort' },
  an_sort_dl: { vi: 'Lượt tải', en: 'Downloads' },
  an_sort_title: { vi: 'Tên A–Z', en: 'Title A–Z' },
  st_loading: { vi: 'Đang phân tích…', en: 'Analyzing…' },

  // Keyword Insights (redesign)
  kw_title: { vi: 'Keyword Insights', en: 'Keyword Insights' },
  kw_sub: { vi: 'Xếp hạng keyword theo cơ hội — nhu cầu cao, cạnh tranh thấp.', en: 'Rank keywords by opportunity — high demand, low competition.' },
  kw_search_ph: { vi: 'Nhập chủ đề hạt giống…', en: 'Enter a seed topic…' },
  kw_find: { vi: 'Phân tích', en: 'Find' },
  kw_scatter: { vi: 'Bản đồ cơ hội', en: 'Opportunity map' },
  kw_top: { vi: 'Top cơ hội', en: 'Top opportunities' },
  kw_col_kw: { vi: 'Keyword', en: 'Keyword' },
  kw_col_demand: { vi: 'Nhu cầu', en: 'Demand' },
  kw_col_supply: { vi: 'Số asset', en: 'Supply' },
  kw_col_comp: { vi: 'Cạnh tranh', en: 'Competition' },
  kw_col_score: { vi: 'Opportunity', en: 'Opportunity' },
  kw_zone: { vi: 'Vùng cơ hội vàng', en: 'Golden zone' },
  kw_axis_comp: { vi: 'Cạnh tranh →', en: 'Competition →' },
  kw_axis_demand: { vi: 'Nhu cầu →', en: 'Demand →' },
  kw_table: { vi: 'Bảng keyword', en: 'Keyword table' },

  sm_results: { vi: 'KẾT QUẢ', en: 'RESULTS FOUND' },
  sm_enriched: { vi: 'FILE ĐÃ LẤY', en: 'ENRICHED FILES' },
  sm_avg_dl: { vi: 'DOWNLOAD TB', en: 'AVG DOWNLOADS' },
  sm_top_dl: { vi: 'DOWNLOAD CAO NHẤT', en: 'TOP DOWNLOADS' },

  // ── Analytics: Portfolio overview dashboard ──
  ov_title: { vi: 'Tổng quan portfolio', en: 'Portfolio overview' },
  ov_analyzing: { vi: 'Đang phân tích sâu portfolio…', en: 'Deep-analyzing portfolio…' },
  ov_scanned_of: { vi: 'asset đã quét trên', en: 'assets scanned of' },
  ov_time: { vi: 'Thời gian', en: 'Time' },
  sc_total_dl: { vi: 'Tổng download', en: 'Total downloads' },
  sc_median: { vi: 'Trung vị DL/asset', en: 'Median DL/asset' },
  sc_top: { vi: 'Asset cao nhất', en: 'Top asset' },
  sc_zero: { vi: '% asset 0 download', en: '% zero-download' },
  sc_conc: { vi: 'Top 10% gánh', en: 'Top 10% share' },
  sc_velocity: { vi: 'Download/tháng (ước tính)', en: 'Downloads/month (est.)' },
  sc_ai: { vi: '% nội dung AI', en: '% AI content' },
  sc_avg: { vi: 'TB download/asset', en: 'Avg DL/asset' },
  ch_timeline: { vi: 'Download theo tháng upload', en: 'Downloads by upload month' },
  ch_dist: { vi: 'Phân bố download', en: 'Download distribution' },
  ch_content: { vi: 'Cơ cấu loại nội dung', en: 'Content-type mix' },
  ch_aisplit: { vi: 'AI vs Thường', en: 'AI vs human' },
  ch_topkw: { vi: 'Top keyword theo download', en: 'Top keywords by downloads' },
  ch_movers: { vi: 'Asset nổi bật (download/tháng)', en: 'Top movers (downloads/month)' },
  mv_velocity: { vi: 'DL/tháng', en: 'DL/mo' },
  ai_label: { vi: 'AI', en: 'AI' },
  human_label: { vi: 'Thường', en: 'Human' },
  dist_assets: { vi: 'số asset', en: 'assets' },

  // ---- Landing page ----
  lp_launch: { vi: 'Mở app', en: 'Launch app' },
  lp_hero_eyebrow: { vi: 'Bộ công cụ cho Adobe Stock Contributor', en: 'The Adobe Stock contributor suite' },
  lp_hero_title: { vi: 'Scrape title, soi từ khoá & xu hướng — rồi tạo prompt AI trong vài giây', en: 'Scrape titles, mine keywords & trends — then build AI prompts in seconds' },
  lp_hero_sub: { vi: 'Stocklytics gom 4 công cụ Adobe Stock vào một nơi: tạo prompt hàng loạt, phân tích portfolio, tìm từ khoá cơ hội và bắt xu hướng. Không cần đăng nhập, chạy thẳng trên trình duyệt.', en: 'Stocklytics bundles four Adobe Stock tools in one place: bulk prompt generation, portfolio analytics, opportunity-keyword research and trend tracking. No login, runs right in your browser.' },
  lp_cta_primary: { vi: 'Bắt đầu miễn phí', en: 'Start free' },
  lp_cta_secondary: { vi: 'Xem tính năng', en: 'See features' },
  lp_stat_tools: { vi: 'công cụ trong 1 app', en: 'tools in one app' },
  lp_stat_assets: { vi: 'asset / lần quét', en: 'assets / scan' },
  lp_stat_themes: { vi: 'theme giao diện', en: 'UI themes' },
  lp_stat_login: { vi: 'không cần đăng nhập', en: 'no login required' },
  lp_features_title: { vi: 'Bốn công cụ, một quy trình', en: 'Four tools, one workflow' },
  lp_features_sub: { vi: 'Mỗi công cụ giải một việc — dùng riêng hay nối tiếp đều được.', en: 'Each tool does one job — use them alone or chain them together.' },
  lp_feat_gen_t: { vi: 'Prompt Generator', en: 'Prompt Generator' },
  lp_feat_gen_d: { vi: 'Dán URL Adobe Stock → scrape title hàng loạt → format thành prompt AI, xuất TXT/CSV.', en: 'Paste an Adobe Stock URL → bulk-scrape titles → format into AI prompts, export TXT/CSV.' },
  lp_feat_an_t: { vi: 'Portfolio Analytics', en: 'Portfolio Analytics' },
  lp_feat_an_d: { vi: 'Search theo creator/keyword → KPI, biểu đồ và danh sách Top download 100/500.', en: 'Search by creator/keyword → KPIs, charts and a Top-downloads 100/500 list.' },
  lp_feat_kw_t: { vi: 'Keyword Insights', en: 'Keyword Insights' },
  lp_feat_kw_d: { vi: 'Tìm từ khoá cầu cao – cạnh tranh thấp bằng Opportunity Score, bảng sắp xếp được.', en: 'Find high-demand, low-competition keywords via an Opportunity Score, in a sortable table.' },
  lp_feat_tr_t: { vi: 'Trends', en: 'Trends' },
  lp_feat_tr_d: { vi: 'Từ khoá hot và asset tăng nhanh theo chủ đề, tự làm mới.', en: 'Hot keywords and fast-rising assets by topic, auto-refreshing.' },
  lp_feat_open: { vi: 'Mở công cụ', en: 'Open tool' },
  lp_why_title: { vi: 'Vì sao chọn Stocklytics', en: 'Why Stocklytics' },
  lp_why_1_t: { vi: 'Không đăng nhập, riêng tư', en: 'No login, private' },
  lp_why_1_d: { vi: 'App stateless — không tài khoản, không lưu dữ liệu của bạn trên server.', en: 'Stateless app — no accounts, your data is not stored on a server.' },
  lp_why_2_t: { vi: 'Né chặn IP', en: 'Bypasses IP blocking' },
  lp_why_2_d: { vi: 'Dùng Adobe Stock REST API thay vì scrape HTML, chạy ổn trên cloud.', en: 'Uses the Adobe Stock REST API instead of HTML scraping, stable on the cloud.' },
  lp_why_3_t: { vi: 'Xuất TXT & CSV', en: 'Export TXT & CSV' },
  lp_why_3_d: { vi: 'Lấy dữ liệu ra ngay: title thuần (TXT) hoặc bảng đầy đủ (CSV).', en: 'Get your data out instantly: plain titles (TXT) or full table (CSV).' },
  lp_why_4_t: { vi: 'Đổi theme tức thì', en: 'Instant theming' },
  lp_why_4_d: { vi: '6 theme + song ngữ VI/EN, đổi ngay không tải lại.', en: '6 themes + VI/EN bilingual, switch instantly with no reload.' },
  lp_how_title: { vi: 'Dùng trong 3 bước', en: 'Three steps' },
  lp_how_1_t: { vi: 'Nhập URL hoặc keyword', en: 'Enter a URL or keyword' },
  lp_how_1_d: { vi: 'Dán link Adobe Stock, hoặc gõ từ khoá / creator ID.', en: 'Paste an Adobe Stock link, or type a keyword / creator ID.' },
  lp_how_2_t: { vi: 'Chạy', en: 'Run' },
  lp_how_2_d: { vi: 'App quét và xử lý dữ liệu qua Adobe Stock API.', en: 'The app scans and processes data via the Adobe Stock API.' },
  lp_how_3_t: { vi: 'Xuất kết quả', en: 'Export results' },
  lp_how_3_d: { vi: 'Tải prompt / danh sách ra TXT hoặc CSV, hoặc copy nhanh.', en: 'Download prompts / lists as TXT or CSV, or quick-copy.' },
  lp_final_title: { vi: 'Sẵn sàng tạo prompt nhanh hơn?', en: 'Ready to build prompts faster?' },
  lp_final_sub: { vi: 'Mở app và bắt đầu ngay — miễn phí, không cần đăng ký.', en: 'Open the app and start now — free, no sign-up.' },
  lp_footer_tools: { vi: 'Công cụ', en: 'Tools' },
};

export function t(lang: Lang, key: string): string {
  const entry = STR[key];
  return entry ? entry[lang] ?? entry.vi : key;
}
