pipeline {
  agent any

  environment {
    REGISTRY = "${params.DOCKER_REGISTRY ?: env.DOCKER_REGISTRY ?: 'registry.example.com'}"
    BACKEND_IMAGE = "${REGISTRY}/insurance-erp-backend"
    FRONTEND_IMAGE = "${REGISTRY}/insurance-erp-frontend"
  }

  parameters {
    string(name: 'DOCKER_REGISTRY', defaultValue: 'registry.example.com', description: 'Docker registry host for pushing images (e.g. docker.io/myorg)')
    choice(name: 'DEPLOY_ENV', choices: ['local', 'production', 'none'], description: 'Choose deployment overlay')
    booleanParam(name: 'PUSH_IMAGES', defaultValue: false, description: 'Push built images to the configured registry')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Backend Image') {
      steps {
        dir('back_end') {
          script {
            dockerImage = docker.build("${BACKEND_IMAGE}:${env.BUILD_NUMBER}")
          }
        }
      }
    }

    stage('Build Frontend Image') {
      steps {
        dir('frontend') {
          script {
            dockerImageFrontend = docker.build("${FRONTEND_IMAGE}:${env.BUILD_NUMBER}")
          }
        }
      }
    }

    stage('Push Images') {
      when {
        expression { return params.PUSH_IMAGES }
      }
      steps {
        script {
          docker.withRegistry("https://${REGISTRY}", 'docker-registry-credentials') {
            dockerImage.push("${env.BUILD_NUMBER}")
            dockerImage.push('latest')
            dockerImageFrontend.push("${env.BUILD_NUMBER}")
            dockerImageFrontend.push('latest')
          }
        }
      }
    }

    stage('Deploy to Kubernetes') {
      when {
        expression { return params.DEPLOY_ENV != 'none' }
      }
      steps {
        script {
          sh "kubectl version --client"
          sh "kubectl apply -k k8s/overlays/${params.DEPLOY_ENV}"
        }
      }
    }
  }

  post {
    always {
      echo "Finished Jenkins pipeline for ${params.DEPLOY_ENV}"
    }
    success {
      echo 'Pipeline completed successfully.'
    }
    failure {
      echo 'Pipeline failed.'
    }
  }
}
