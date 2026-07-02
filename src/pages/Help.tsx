import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function Help() {
  const navigate = useNavigate();

  const sections = [
    {
      title: '浏览菜谱',
      content: '首页可查看本周计划和精选菜谱，点击分类图标浏览不同菜系，搜索栏支持按菜名、食材搜索。',
    },
    {
      title: '写菜谱',
      content: '在「设置」中配置百度文心 AI 生图或微软 Bing 图片搜索（国内/Azure 密钥）。写菜谱时点击「生成封面」即可；未配置时使用本地离线封面。',
    },
    {
      title: '导入菜谱',
      content: '在首页或「我的」页面点击「导入菜谱」，支持 JSON 文件导入或粘贴 JSON 数据。',
    },
    {
      title: '收藏与计划',
      content: '在菜谱详情页点击爱心收藏；首页本周计划可勾选完成状态，点击菜名查看详情。',
    },
    {
      title: '反馈',
      content: '如有问题或建议，欢迎通过 GitHub Issues 或邮件反馈（可在项目仓库查看联系方式）。',
    },
  ];

  return (
    <div className="min-h-screen">
      <div
        className="sticky top-0 bg-white/80 backdrop-blur-md z-50 px-4 pt-4 pb-3 border-b border-surface/30"
        style={{ top: 'var(--safe-top)' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-surface/50 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-text-primary" />
          </button>
          <h1 className="font-serif text-xl font-semibold text-text-primary">帮助与反馈</h1>
        </div>
      </div>

      <main className="px-4 py-6 space-y-4">
        {sections.map((section) => (
          <section key={section.title} className="bg-white rounded-2xl shadow-card p-4">
            <h2 className="font-serif text-lg font-semibold text-text-primary mb-2">
              {section.title}
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">{section.content}</p>
          </section>
        ))}
      </main>
    </div>
  );
}
