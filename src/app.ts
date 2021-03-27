import container from "./service-locator/container";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import {graphqlUploadExpress} from "graphql-upload";
import authRouter from "./features/auth/rest/router";
import TYPES from "./service-locator/types";
import {buildSchema} from "type-graphql";
import {AuthResolver} from "./features/auth/graphql/resolver";
import {UserResolver} from "./features/user/graphql/resolver";
import {ApolloServer, GetMiddlewareOptions} from "apollo-server-express";
import errorInterceptor from "./shared/graphql/middlewares/error-interceptor";
import Context, {ToolBox} from "./shared/context";
import corsOptions from "./shared/cors";
import FriendResolver from "./features/friend/graphql/resolver";
import BadgeResolver from "./features/badge/graphql/resolver";
import NotificationResolver from "./features/notification/graphql/resolver";
import BlockResolver from "./features/block/graphql/resolver";

const createApp = async (toolBox: ToolBox) => {
  const app = express();
  const CORS = cors(corsOptions);

  app.use(express.static('storage'));
  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.use(graphqlUploadExpress({maxFileSize: 10000000, maxFiles: 10}));
  // Token related auth stuff are not handled by this express middleware
  app.use('/auth', CORS, authRouter(container.get(TYPES.Tokens)));

  // GraphQL server stuff
  const schema = await buildSchema({
    resolvers: [
      AuthResolver,
      UserResolver,
      FriendResolver,
      BadgeResolver,
      BlockResolver,
      NotificationResolver
    ],
    globalMiddlewares: [errorInterceptor],
    dateScalarMode: 'timestamp'
  });
  const server = new ApolloServer({
    schema,
    uploads: false,
    context: ({req, res}): Context => {
      return {
        req,
        res,
        toolBox
      };
    }
  });
  server.applyMiddleware({
    app,
    cors: corsOptions as GetMiddlewareOptions['cors'],
  });
  return app;
};

export default createApp;