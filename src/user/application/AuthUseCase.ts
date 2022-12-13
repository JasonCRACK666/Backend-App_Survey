import jwt from 'jsonwebtoken'
import config from '../../config'

import { PasswordEncrypter } from '../infrastructure/utils/passwordEncrypter'

import { UserEntity } from '../domain/UserEntity'
import { UserValue } from '../domain/UserValue'
import { UserRepository } from '../domain/UserRepository'

export class AuthUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  public registerUser = async (
    userData: Omit<UserEntity, 'id' | 'is_admin'>
  ) => {
    const userFoundForUsername = await this.userRepository.findUserByUsername(
      userData.username
    )

    if (userFoundForUsername)
      throw {
        status: 406,
        error: 'El nombre de usuario ya esta en uso, utilice otro',
      }

    const userFoundForEmail = await this.userRepository.findUserByEmail(
      userData.email
    )

    if (userFoundForEmail)
      throw {
        status: 406,
        error: 'El correo electrónico ya esta en uso, utilice otro',
      }

    const userValue = new UserValue(userData)
    const userRegistered = await this.userRepository.registerUser(userValue)

    if (!userRegistered)
      throw {
        status: 404,
        error: 'El usuario no ha sido creado',
      }

    return { status: 200, user: userRegistered }
  }

  public loginUser = async ({
    email,
    password,
  }: {
    email: string
    password: string
  }) => {
    const user = await this.userRepository.findUserByEmail(email)
    if (!user)
      throw {
        status: 404,
        error: 'No existe ningún usuario con el correo ingresado',
      }

    const matchPassword = await PasswordEncrypter.comparePassword(
      password,
      user.password
    )
    if (!matchPassword)
      throw {
        status: 404,
        error: 'La contraseña con incide con la cuenta a ingresar',
      }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      config.SECRET!,
      {
        expiresIn: '12h',
      }
    )

    return {
      status: 200,
      token,
    }
  }
}