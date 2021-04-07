import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import Head from 'next/head';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
  const router = useRouter();

  const timeToRead = post.data.content.reduce((sum, content) => {
    const eachWord = RichText.asText(content.body).split(' ').length;
    return Math.ceil(sum + eachWord / 200);
  }, 0);

  if (router.isFallback) {
    return <p>Carregando...</p>;
  }

  return (
    <>
      <Head>
        <title>{post.data.title} ∣ spacetraveling</title>
      </Head>

      <div className={styles.container}>
        <img src={post.data.banner.url} alt="banner" />
        <div className={commonStyles.container}>
          <main className={styles.main}>
            <header>
              <h1>{post.data.title}</h1>
              <div>
                <div>
                  <FiCalendar />
                  <time>
                    {format(
                      new Date(post.first_publication_date),
                      'dd MMM yyyy',
                      {
                        locale: ptBR,
                      }
                    )}
                  </time>
                </div>
                <div>
                  <FiUser />
                  {post.data.author}
                </div>
                <div>
                  <FiClock />
                  <span>{timeToRead} min</span>
                </div>
              </div>
            </header>

            <div>
              {post.data.content.map(contentItem => (
                <article key={contentItem.heading}>
                  <h2>{contentItem.heading}</h2>

                  <>
                    {contentItem.body.map((contentBody, index) => {
                      return contentBody.type === 'list-item' ? (
                        <ul key={index}>
                          <li>{contentBody.text}</li>
                        </ul>
                      ) : (
                        <p key={index}>{contentBody.text}</p>
                      );
                    })}
                  </>
                </article>
              ))}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    {
      fetch: ['post.title', 'post.subtitle', 'post.author'],
    }
  );

  const slugs = posts.results.map(slug => slug.uid);

  return {
    paths: slugs.map(slug => ({
      params: { slug },
    })),
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(itemContent => {
        return {
          heading: itemContent.heading,
          body: itemContent.body.map(contentBody => {
            return {
              text: contentBody.text,
              type: contentBody.type,
              spans: [...contentBody.spans],
            };
          }),
        };
      }),
    },
  };

  return {
    props: {
      post,
    },
  };
};
