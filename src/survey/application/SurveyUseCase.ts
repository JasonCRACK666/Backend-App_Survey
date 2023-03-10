import {
  SurveyComplete,
  SurveyEntity,
  SurveyUserEntity,
} from '../domain/SurveyEntity'
import { SurveyRepository } from '../domain/SurveyRepository'
import { SurveyValue } from '../domain/SurveyValue'

import { QuestionRepository } from '../../question/domain/QuestionRepository'
import {
  QuestionDetailEntity,
  QuestionDetailWithOptions,
  QuestionWithOptionsRecived,
} from '../../question/domain/QuestionEntity'
import { QuestionValue } from '../../question/domain/QuestionValue'

import { QuestionOptionRepository } from '../../questionOption/domain/QuestionOptionRepository'
import { QuestionOptionValue } from '../../questionOption/domain/QuestionOptionValue'
import { QuestionOptionEntity } from '../../questionOption/domain/QuestionOptionEntity'

export class SurveyUseCase {
  constructor(
    private readonly surveyRepository: SurveyRepository,
    private readonly questionRepository: QuestionRepository,
    private readonly questionOptionRepository: QuestionOptionRepository
  ) {}

  public getAllSurveys = async (
    userId: string
  ): Promise<{
    status: number
    surveys: Omit<SurveyEntity, 'user_id'>[]
  }> => {
    let allSurveys: Omit<SurveyEntity, 'user_id'>[]
    try {
      allSurveys = await this.surveyRepository.findAllSurveys(userId)
    } catch (error) {
      throw {
        status: 500,
        error: 'Hubo un error, no se puedo obtener las encuestas',
      }
    }

    return {
      status: 200,
      surveys: allSurveys,
    }
  }

  public getSurveyQuestionsAndOptions = async (
    surveyId: string
  ): Promise<{
    status: number
    survey: SurveyUserEntity
    questions: QuestionDetailWithOptions[]
  }> => {
    let survey: SurveyUserEntity | null
    try {
      survey = await this.surveyRepository.findSurveyById(surveyId)
    } catch (error) {
      throw {
        status: 500,
        error: 'Hubo un error, no se puedo hacer la búsqueda de la encuesta',
      }
    }

    if (!survey)
      throw {
        status: 404,
        error: 'No se ha encontrado la encuesta',
      }

    let questions: QuestionDetailEntity[] | null

    try {
      questions = await this.questionRepository.findQuestionsBySurveyId(
        survey.id
      )
    } catch (error) {
      throw {
        status: 500,
        error: 'Hubo un error, no se puedo obtener las preguntas',
      }
    }

    if (!questions || questions.length === 0)
      throw {
        status: 404,
        error: 'No se ha encontrado ninguna pregunta',
      }

    const finalQuestions: QuestionDetailWithOptions[] = []
    for (const question of questions) {
      if (question.question_type === 'text') {
        finalQuestions.push(question)
        continue
      }

      let questionOptions: Omit<QuestionOptionEntity, 'question_id'>[] | null
      try {
        questionOptions =
          await this.questionOptionRepository.findQuestionOptionsByQuestionId(
            question.id
          )
      } catch (error) {
        throw {
          status: 500,
          error:
            'Hubo un error, no se ha podido obtener las opciones de una pregunta',
        }
      }

      if (!questionOptions || questionOptions.length === 0)
        throw {
          status: 403,
          error: 'No se ha encontrado ninguna opción para la pregunta',
        }

      finalQuestions.push({
        id: question.id,
        question_type: question.question_type,
        question: question.question,
        options: questionOptions,
      })
    }

    return {
      status: 200,
      survey,
      questions: finalQuestions,
    }
  }

  public whetherUserHasAlreadyCompletedSurvey = async (
    userId: string,
    surveyId: string
  ): Promise<{ status: number; isCompleted: boolean }> => {
    let survey: SurveyUserEntity | null
    try {
      survey = await this.surveyRepository.findSurveyById(surveyId)
    } catch (error) {
      throw {
        status: 500,
        error: 'Hubo un error, no se pudo hacer la búsqueda de la encuesta',
      }
    }

    if (!survey)
      throw {
        status: 404,
        error: 'La encuesta no existe',
      }

    let surveyCompleted: SurveyComplete | null
    try {
      surveyCompleted = await this.surveyRepository.findCompleteSurvey(
        userId,
        survey.id
      )
    } catch (error) {
      throw {
        status: 500,
        error: 'Hubo un error, no se pudo hacer la búsqueda de la encuesta',
      }
    }

    return {
      status: 200,
      isCompleted: Boolean(surveyCompleted),
    }
  }

  public createSurveyQuestionsAndOptions = async (
    userId: string,
    title: string,
    description: string,
    questions: QuestionWithOptionsRecived[]
  ): Promise<{ status: number; message: string; surveyId: string }> => {
    const surveyValue = new SurveyValue({
      title,
      description,
      user_id: userId,
    })

    let surveyCreated: SurveyUserEntity | null
    try {
      surveyCreated = await this.surveyRepository.createSurvey(surveyValue)
    } catch (error) {
      throw {
        status: 500,
        error: 'No se ha podido crear la encuesta',
      }
    }

    if (!surveyCreated)
      throw {
        status: 404,
        error: 'La encuesta no se ha podido crear',
      }

    for (const question of questions) {
      const questionType = await this.questionRepository.findQuestionTypeById(
        question.question_type_id
      )

      if (!questionType)
        throw {
          status: 404,
          error: 'Hubo un error con el tipo de pregunta que se selecciono',
        }

      const questionValue = new QuestionValue({
        survey_id: surveyCreated!.id,
        question_type_id: questionType.id,
        question: question.question,
      })

      let questionCreated: QuestionDetailEntity | null
      try {
        questionCreated = await this.questionRepository.createQuestion(
          questionValue
        )
      } catch (error) {
        throw {
          status: 500,
          error:
            'Hubo un error, se ha podido crear una pregunta de la encuesta',
        }
      }

      if (questionType.name === 'multi' && question.options) {
        for (const option of question.options) {
          const optionValue = new QuestionOptionValue({
            question_id: questionCreated!.id,
            option: option.value,
          })

          try {
            await this.questionOptionRepository.createQuestionOption(
              optionValue
            )
          } catch (error) {
            throw {
              status: 500,
              error:
                'Hubo un error al crear una opción para una pregunta multiple',
            }
          }
        }
      }
    }

    return {
      status: 200,
      message: 'Se ha creado correctamente la encuesta',
      surveyId: surveyCreated.id,
    }
  }

  public deleteOneSurvey = async (
    surveyId: string,
    username: string
  ): Promise<{
    status: number
    message: string
  }> => {
    let survey: SurveyUserEntity | null
    try {
      survey = await this.surveyRepository.findSurveyById(surveyId)
    } catch (error) {
      throw {
        status: 500,
        error: 'Hubo un error, no se puedo hacer la busqueda de la encuesta',
      }
    }

    if (!survey)
      throw {
        status: 404,
        error: 'La encuesta no existe',
      }

    if (survey.username !== username)
      throw {
        status: 401,
        error: 'La encuesta no es de su pertenencia',
      }

    try {
      await this.surveyRepository.deleteSurveyById(survey.id)
    } catch (error) {
      throw {
        status: 500,
        error: 'Hubo un error, no se puedo eliminar la encuesta',
      }
    }

    return {
      status: 200,
      message: 'Se ha eliminado la encuesta correctamente',
    }
  }
}
