FROM ruby:3.3-alpine

RUN apk add --no-cache \
    build-base \
    postgresql-dev \
    tzdata \
    git

WORKDIR /app

COPY Gemfile Gemfile.lock* ./
RUN bundle install

COPY . .

EXPOSE 3000

CMD ["rails", "server", "-b", "0.0.0.0"]
