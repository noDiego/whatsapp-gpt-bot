import logger from '../logger';
import OpenAI, { toFile } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { CONFIG } from '../config';

export class ChatGTP {

  private openai: OpenAI;
  private readonly gptModel: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: CONFIG.openAI.apiKey,
    });
    this.gptModel = <string>process.env.GPT_MODEL;
  }

  /**
   * Sends a series of messages to the OpenAI Chat Completion API and retrieves a generated completion.
   * This function is designed to interact with the OpenAI API, sending it a context composed of several messages.
   * It then receives a response that is generated based on this context, aiming to provide a coherent and contextually appropriate continuation or reply.
   *
   * Parameters:
   * - messageList: An array of ChatCompletionMessageParam objects, which include the messages that form the context for the API request.
   *
   * Returns:
   * - A promise that resolves to the generated completion string, which is the API's response based on the provided context.
   */
  async sendCompletion(messageList: ChatCompletionMessageParam[], systemPrompt: string) {

    logger.debug(`[ChatGTP->sendCompletion] Sending ${messageList.length} messages.`);

    messageList.unshift({role: 'system', content:systemPrompt});

    const completion = await this.openai.chat.completions.create({
      model: CONFIG.openAI.chatCompletionModel,
      messages: messageList,
      max_tokens: 1024,
      top_p: 1,
      frequency_penalty: 0.5,
      presence_penalty: 0
    });

    logger.debug('[ChatGTP->sendCompletion] Completion Response:');
    logger.debug(completion.choices[0]);

    const messageResult = completion.choices[0].message;

    return messageResult?.content || '';
  }

  /**
   * Requests the generation of an image based on a textual description, by interacting with OpenAI's image generation API.
   * This function takes a prompt in the form of text and sends a request to generate an image that corresponds with the text description provided.
   * It aims to utilize OpenAI's capabilities to create visually representative images based on textual inputs.
   *
   * Parameters:
   * - message: A string containing the text description that serves as the prompt for image generation.
   *
   * Returns:
   * - A promise that resolves to the URL of the generated image. This URL points to the image created by OpenAI's API based on the input prompt.
   */
  async createImage(message){

    logger.debug(`[ChatGTP->createImage] Creating message for: "${message}"`);

    const response = await this.openai.images.generate({
      model: CONFIG.openAI.imageCreationModel,
      prompt: message,
      quality: 'standard',
      n: 1,
      size: "1024x1024",
    });
    return response.data[0].url;
  }

  /**
   * Generates speech audio from provided text by utilizing OpenAI's Text-to-Speech (TTS) API.
   * This function translates text into spoken words in an audio format. It offers a way to convert written messages into audio, providing an audible version of the text content.
   * If a specific voice model is specified in the configuration, the generated speech will use that voice.
   *
   * Parameters:
   * - message: A string containing the text to be converted into speech. This text serves as the input for the TTS engine.
   *
   * Returns:
   * - A promise that resolves to a buffer containing the audio data in MP3 format. This buffer can be played back or sent as an audio message.
   */
  async speech(message, responseFormat?){

    logger.debug(`[ChatGTP->speech] Creating speech audio for: "${message}"`);

    const response: any = await this.openai.audio.speech.create({
      model: CONFIG.openAI.speechModel,
      voice: <any>CONFIG.openAI.speechVoice,
      input: message,
      response_format: responseFormat || 'mp3'
    });

    logger.debug(`[ChatGTP->speech] Audio Creation OK`);

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Transcribes audio content into text using OpenAI's transcription capabilities.
   * This function takes an audio file and sends a request to OpenAI's API to generate a textual representation of the spoken words.
   * It leverages the Whisper model for high-quality transcription, converting audio inputs into readable text output.
   *
   * Parameters:
   * - message: A string indicating the audio file path or description for logging purposes. Currently, it is not used in the function's implementation but can be helpful for future extensions or logging clarity.
   *
   * Returns:
   * - A promise that resolves to a string containing the transcribed text. This string is the result of processing the provided audio through OpenAI's transcription model.
   *
   * Throws:
   * - Any errors encountered during the process of reading the audio file or interacting with OpenAI's API will be thrown and should be handled by the caller function.
   */
  async transcription(stream: any) {
    logger.debug(`[ChatGTP->transcription] Creating transcription text for audio"`);
    try {
      // Convertir ReadStream a File o Blob
      const file = await toFile(stream, 'audio.ogg', { type: 'audio/ogg' });
      // Enviar el archivo convertido a la API de transcripción
      const response = await this.openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        language: CONFIG.openAI.transcriptionLanguage
      });
      return response.text;
    } catch (e: any) {
      logger.error(e.message);
      throw e;
    }
  }

}
