import {Arg, Ctx, Mutation, Query, Resolver, UseMiddleware} from "type-graphql";
import {User, UserCreation} from "./types";
import * as path from "path";
import {ApolloError, UserInputError} from "apollo-server-express";
import {createWriteStream} from "fs";

import isAuthenticated from "../../auth/graphql/is-authenticated";
import Context from "../../../context";

const validators = {
  validateUsername(username: string) {
    if (username.length == 0) return 'A username is required';
    if (username[0] == '.' || username[username.length - 1] == '.')
      return "The username can't start or end with a dot";
    if (/\.{2,}/.test(username)) return "The username can't have 2 consecutive dots";
    if (username.length < 4) return 'Username must be 4 characters at least';
    if (username.length > 20) return 'Username must be 20 characters at most';
    if (!/^[a-z0-9._]+$/.test(username)) return 'Username can only contain letter, numbers, . and _';
  },
  validateName(name: string) {
    if (name.length > 50) return 'Name must be 50 characters at most';
  }
};

@Resolver()
export class UserResolver {
  @Query(_returns => User)
  @UseMiddleware(isAuthenticated)
  async me(@Ctx() context: Context): Promise<User> {
    console.log('ME UID: ', context.userID);
    const user = await context.dataSources.userDS.getUser(context.userID!);
    if (!user) throw new ApolloError("This user has to register", "USER_NOT_FOUND");
    this._completePhotoUrl(user, context);
    return user;
  }

  @Mutation(_returns => User)
  @UseMiddleware(isAuthenticated)
  async register(
    @Ctx() context: Context,
    @Arg('input') creation: UserCreation
  ) {
    const usernameError = validators.validateUsername(creation.username);
    const nameError = validators.validateName(creation.name ?? '');
    if (usernameError || nameError) {
      const errors: any = {};
      if (usernameError) errors.username = usernameError;
      if (nameError) errors.name = nameError;
      throw new UserInputError('Invalid input', errors);
    }

    const usernameTaken = await
      context.dataSources.userDS.isUsernameTaken(creation.username);
    if (usernameTaken)
      throw new ApolloError('Username taken', 'USERNAME_TAKEN');

    let photoPath: string | undefined;
    if (creation.photo) {
      const {createReadStream, mimetype} = await creation.photo;
      const photoType = mimetype.split('/')[1];
      photoPath = `${context.userID}_pp.${photoType}`;
      const rootPath = path.dirname(require.main?.filename!);
      const writeableStream = createWriteStream(
        `${rootPath}/../storage/${photoPath}`,
        {autoClose: true}
      );
      const saved = await new Promise<boolean>(resolve => {
        createReadStream()
          .pipe(writeableStream)
          .on('finish', () => resolve(true))
          .on('error', () => resolve(false));
      });
      if (!saved) {
        throw new ApolloError(
          "Couldn't save the photo",
          "INTERNAL_SERVER_ERROR"
        );
      }
    }
    const user = await context.dataSources.userDS.createUser({
      authUserID: context.userID!,
      username: creation.username,
      name: creation.name ?? undefined,
      photoURL: photoPath,
    });
    this._completePhotoUrl(user, context);
    return user;
  }

  @Query(_returns => Boolean)
  @UseMiddleware(isAuthenticated)
  checkUsernameExistence(
    @Ctx() context: Context,
    @Arg('username') username: string
  ): Promise<boolean> {
    return context.dataSources.userDS.isUsernameTaken(username);
  }

  _completePhotoUrl(user: User, context: Context) {
    if (user.photoURL) {
      const req = context.req;
      const PORT = process.env.PORT ?? 4000;
      const port = (PORT == '80' || PORT == '443') ? '' : `:${PORT}`;
      user.photoURL = `${req.protocol}://${req.hostname}${port}/${user.photoURL}`;
    }
  }
}