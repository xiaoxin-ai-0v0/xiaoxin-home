import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

  return rss({
    title: '小新的博客',
    description: '技术、生活与项目实践记录',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: `${basePath}/blog/${post.slug}/`,
    })),
  });
}
